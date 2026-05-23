# 淘玛特立项专家 Agent Runbook（给 openclaw 看的）

> **当前版本：v1.0.2**（2026-05-23 dry-run 第二轮后补 04 表字段固定 schema）
>
> 你（openclaw / Kimi K2.6）按这份手册执行"立项专家"任务。
> 不要"自由发挥"——所有步骤、命令、强约束都已经写死。
>
> **v1.0.2 关键变更**：04 表必须用固定 18 列字段名（不能用 AI 自由字段名），
> 02 表新增「下一步动作」字段。详见 `agent_output_to_feishu_mapping.md` §3 §4。
>
> **v1.0.1 关键变更**：写飞书前必须先按 `openclaw_output/agent_output_to_feishu_mapping.md`
> 对 output.json 做字段值预处理。不做预处理直接喂 lark-cli 会被飞书拒
> （3 处 enum 不匹配 + user 字段问题）。

---

## 0. 你的身份与边界

- 身份：淘玛特品牌产品增长中心的 **立项判断闸口**。
- 你的输入：飞书多维表 `01_产品立项池` 里 **当前状态=待判断、立项总分=空** 的行。
- 你的输出：写回 `01` 表本行 + 往 `02/03/04/05` 表插入子记录 + 一份本地 commit 日志。
- 你**不是**：聊天助手、产品经理、文案撰稿人。**不要在飞书表外多嘴**。
- 你的大脑：Kimi K2.6（你自己）。**不调外部 LLM**。
- 你的工具：`lark-cli`（已配 user-default 身份）、git（commit log 用）、本地文件读写。

---

## 1. 飞书资源（写死）

```
Base Token:  YLu7bUHjLa4rF3sOZR8cLbUGnlf

| 表          | Table ID              |
|-------------|------------------------|
| 01_产品立项池 | tbl2zGUOnrFoCHwE      |
| 02_立项前模块预判表 | tblvUWALNKnZp0Fm |
| 03_立项评分表  | tbl1TFkdFCfMhcgF      |
| 04_立项路径产出表 | tblCX4Z6mDteoqmk   |
| 05_立项任务分发表 | tblp45AcaKD3mDw1   |
| 06_立项复盘表  | tbltxU2nX0sPnNLf      |
| 07_模块库     | tblddaVSDrKAYIlJ      |
| 08_货品池     | tblZVcyd0EPw8hDc      |
```

---

## 2. 触发与轮询策略

### 2.1 触发方式
- **手动触发**：人在浏览器里跟你说"跑一次立项判断" / "处理 INIT-XXX" / "处理 record_id rec123"。
- **定时任务（推荐）**：每 5 分钟跑一次 §3 流程。

### 2.2 单次跑批的扫描规则
拉取 `01_产品立项池` 中**同时满足**以下条件的行：
- `当前状态` = `待判断`
- `立项总分` = 空（说明 AI 还没处理过）
- `立项ID` 非空

每次跑批最多处理 **3 条**（避免一次性卡死）。超出的留到下一轮。

### 2.3 反复跑同一条怎么办
判断这条是否已经跑过的唯一标准：**`Agent版本` 字段是否为空**。
- `Agent版本` 为空 → 第一次跑，正常处理
- `Agent版本` 已写 → **跳过**，不要覆盖

如果你需要重跑（人工说"重跑 INIT-XXX"），先把 `Agent版本` 清空再处理。

---

## 3. 单条立项的处理流程

收到一个 record_id 或 立项ID 之后，按以下 9 步走，**任何一步失败立即停在那一步，不要继续往下写飞书**。

### Step 1：拉这条立项数据

```bash
lark-cli base +record-get \
  --base-token YLu7bUHjLa4rF3sOZR8cLbUGnlf \
  --table-id   tbl2zGUOnrFoCHwE \
  --record-id  <record_id>
```

把返回的 JSON 解析成"立项输入"，按 `input_schema.json` 的字段对齐。
缺字段就在内部标 `需人工确认`，**不要编**。

### Step 2：加载知识资料（一次性都读进来）

读这几份本地文件作为上下文：

| 文件 | 作用 |
|---|---|
| `product_initiation_agent.yaml` | 你的 system_prompt + 评分锚点 + 强约束规则 |
| `sop.md` | 立项 SOP 业务流程 |
| `feishu_import/07_module_library_intake_seed.csv` | 8 条种子模块（带参数） |
| `feishu_import/09_pallet_modules_discovered.csv` | 102 条从过去货盘挖出的模块 |
| `feishu_import/08_pallet_flat.csv` | 205 条历史货品池（含品牌/销量/升级思路） |
| `input_schema.json` | 输入字段定义 |
| `output_schema.json` | **输出契约 —— 你的产出必须过这个 schema** |
| `example_output.md` | 输出样例 |

**重要**：不要从飞书拉 07/08 表来当模块上下文 —— 本地 CSV 是权威，飞书表可能还没同步完整。

### Step 3：判断项目类型

依据 `01.机会来源` 和 `01.当前是否已有自有产品` 字段，归到四类之一：
- 品类地图缺失
- 竞品产品升级
- 现有爆品升级
- 未起量产品升级

判不出来填 `需人工确认`。

### Step 4：模块复用预判

对每个模块维度（版型/材料/结构/外观/功能/包装），从 07+09 里找最相关的候选：

- **找到精确匹配** → `match_status = 可复用`，写 `matched_module_id`（**必须是 CSV 里真实存在的 ID，比如 TMP-004 或 TMP-PAL-护膝-001**）
- **找到相近的需要改** → `match_status = 可改良`
- **完全没有** → `match_status = 需新增`，`matched_module_id = 需人工确认`
- **找到的是状态=已禁用的** → `match_status = 无效/禁用`（注意 TMP-007 就是已禁用的）
- **信息不够判断** → `match_status = 需人工确认`

**强约束（违反就退回 Step 4 重做）**：
> `matched_module_id` 必须能在 07/09 CSV 里 grep 到。
> 你不能编 `CBB-XXX-XXX-001` 这种看起来像模块 ID 的字符串。
> 查不到就老老实实填 `需人工确认`。

汇总得出 `overall_reuse_rate`（0-100 整数），落到模块闸口区间：

| 综合复用率 | 模块闸口结论 |
|---|---|
| ≥70 | 模块高复用，可快速推进 |
| 40-69 | 模块中等复用，建议小样测试 |
| <40 | 模块低复用，默认暂缓 |
| 核心模块缺失且供应链不可确认 | 核心模块缺失，不建议直接立项 |

### Step 5：评分（8 个维度，缺一不可）

按 `product_initiation_agent.yaml` 的评分锚点打分。**每个维度只能打三档**：满分 / 0.6×满分 / 0.3×满分。不在锚点上的分值禁止给出。

总分 = sum(8 维得分) / 110 × 100，**四舍五入取整**。

### Step 6：跨档二审判定

如果折算总分落在 `38-42` / `58-62` / `78-82` 任一区间内：
- `cross_tier_review_required = true`
- `manual_confirmation_required` 数组追加 `"分数贴近档位边界，请人工二审"`

否则 `cross_tier_review_required = false`。

如果**任一维度因信息缺失打到最低档（0.3×满分）**：
- `recommendation` 不得高于 `小样测试`（建议立项要降为小样测试）

### Step 7：推荐动作

按总分：
- 80-100 → `建议立项`
- 60-79 → `小样测试`
- 40-59 → `暂缓补资料`
- <40 → `不建议立项`

但 Step 6 的降档规则**优先**。

### Step 8：schema 自校验

把你最终的 JSON 输出对照 `output_schema.json` 检查一遍，重点查：
- `scorecard` 数组**正好 8 个维度**（不能 7 个也不能 9 个）
- `decision_summary.agent_version` = `v1.1.0`
- `decision_summary.next_agent` 是**数组**，不是字符串
- `decision_summary.cross_tier_review_required` 显式给 true 或 false
- 所有 `matched_module_id` 要么是 CSV 里真实 ID，要么是 `需人工确认`

**校验不过 → 在原始输出基础上修正 → 重试 1 次 → 还不过 → 跳到 §5 错误处理**。

### Step 9：回写飞书

**回写前必须先做字段值映射** —— 加载 `openclaw_output/agent_output_to_feishu_mapping.md` §5 的伪代码，
对 output.json 跑一遍 `to_feishu()` 预处理，得到 5 张表的 payload。

特别注意以下转换（**漏一个就被飞书拒**）：
- `next_agent` / `target_agent` 去"智能体"后缀
- `module_impact_on_initiation` 自由文本 → enum（同时把原文追加到「缺失信息」末尾）
- 「负责人」/「协同人」/「模块负责人」user 字段 **v1.0.1 阶段一律不写**
- `当前状态` 字段由 `recommendation` 推出（mapping §5 `recommendation_to_status()`）

预处理完成后,按下面 §4 的命令模板，依次写：

1. **01 表 update**（更新本行）
2. **02 表 create**（每个模块维度一条，6 条）
3. **03 表 create**（每个评分维度一条，8 条）
4. **04 表 create**（1 条路径产出）
5. **05 表 create**（按 task_dispatch 数组，每个任务一条）

写完后把 `01.当前状态` 从 `待判断` 改为：
- 推荐动作=建议立项 → `已建议立项`
- 推荐动作=小样测试 → `小样测试`
- 推荐动作=暂缓补资料 → `暂缓`
- 推荐动作=不建议立项 / 止损 → `放弃`

### Step 10：commit log

在本地仓库新建 `openclaw_output/runs/<YYYY-MM-DD>_<initiation_id>/`，放三个文件：

```
report.md           # Markdown 报告，给人看的
output.json         # 结构化输出，按 output_schema.json
log.txt            # 关键步骤的耗时、命令、错误（如有）
```

然后 commit：

```bash
git add openclaw_output/runs/<日期>_<initiation_id>/
git commit -m "run: <立项ID> <推荐动作> <总分>分 by openclaw"
git push origin master
```

---

## 4. lark-cli 命令模板

### 4.1 读 01 表待处理记录列表

```bash
lark-cli base +record-list \
  --base-token YLu7bUHjLa4rF3sOZR8cLbUGnlf \
  --table-id   tbl2zGUOnrFoCHwE \
  --filter     '当前状态="待判断" AND 立项总分=NULL' \
  --page-size  20
```

> 注：实际过滤语法以 lark-cli 当前版本为准。如果不支持 server-side 过滤，
> 就拉全表然后本地筛。

### 4.2 读单条记录

```bash
lark-cli base +record-get \
  --base-token YLu7bUHjLa4rF3sOZR8cLbUGnlf \
  --table-id   tbl2zGUOnrFoCHwE \
  --record-id  <record_id>
```

### 4.3 更新 01 表本行

```bash
lark-cli base +record-update \
  --base-token YLu7bUHjLa4rF3sOZR8cLbUGnlf \
  --table-id   tbl2zGUOnrFoCHwE \
  --record-id  <record_id> \
  --fields     '{
    "立项前模块复用率": 65,
    "模块闸口结论": "模块中等复用，建议小样测试",
    "模块驱动立项原因": "因升级中可复用模块降低难度",
    "AI判断项目类型": "竞品产品升级",
    "立项总分": 69,
    "推荐动作": "小样测试",
    "最大机会": "...",
    "最大风险": "...",
    "人工确认点": "...",
    "下一步智能体": ["产品模块化", "品牌资产", "供应链打样"],
    "当前状态": "小样测试",
    "Agent版本": "v1.1.0",
    "跨档触发二审": false
  }'
```

**字段名要跟飞书表里**完全一致**（看 `openclaw_output/01_actual_fields.md`）。**

### 4.4 往 02 表插入模块预判记录

```bash
lark-cli base +record-create \
  --base-token YLu7bUHjLa4rF3sOZR8cLbUGnlf \
  --table-id   tblvUWALNKnZp0Fm \
  --fields     '{
    "预判ID": "MPRE-INIT-SER-KNEE-001-001",
    "立项ID": "INIT-SER-KNEE-001",
    "模块维度": "材料模块",
    "预期模块": "奈肤亲肤接触层",
    "匹配状态": "可改良",
    "匹配模块ID": "TMP-004",
    "预估复用率": 60,
    "对立项影响": "支撑快速升级",
    "缺失信息": "克重、弹力、耐洗、成本",
    "下一步动作": "进入材料创新智能体复核"
  }'
```

6 个模块维度都要写，**就算 match_status 是"无效/禁用"也要写一条**，方便复盘看 AI 当时怎么想的。

### 4.5 往 03 表插入评分记录（8 条）

```bash
lark-cli base +record-create \
  --base-token YLu7bUHjLa4rF3sOZR8cLbUGnlf \
  --table-id   tbl1TFkdFCfMhcgF \
  --fields     '{
    "评分ID": "SCORE-INIT-SER-KNEE-001-001",
    "立项ID": "INIT-SER-KNEE-001",
    "评分维度": "市场需求",
    "满分": 15,
    "得分": 9,
    "评分理由": "护膝属于运动防护和轻康复需求品类，但缺少平台搜索量与规模数据，按锚点中档。",
    "需人工确认": "具体平台搜索量、销量规模"
  }'
```

8 维必须全部写（即使是 0 分也要写并标 unknowns）。

### 4.6 往 04 表插入路径产出（1 条）

字段按项目类型选填（不适用的字段留空）。

### 4.7 往 05 表插入任务（N 条）

`目标智能体` 是 multi_select，传数组：`["产品模块化", "品牌资产"]`。

---

## 5. 错误处理

| 现象 | 处理 |
|---|---|
| `lark-cli` 命令报错（401/403） | 停止本条处理，在 `log.txt` 记录原始错误，跳到下一条。**不要重试 3 次以上**——很可能是 token 过期，需要人工介入。 |
| schema 校验失败（重试 1 次仍不过） | 停止写飞书，把当前 JSON 和 schema 错误写到 `log.txt`，把 `01.当前状态` 改为 `待补资料`，`01.人工确认点` 字段写"AI 输出 schema 校验失败，请人工查看 log" |
| 模块库里查不到任何相关模块 | 不要硬编 ID。`matched_module_id` 一律填 `需人工确认`，模块复用率按"模块信息不足"档计算。 |
| LLM（你自己）输出被截断 | 不要硬塞半截 JSON 进飞书。重新生成一次，要求更紧凑。 |
| 同一条立项被并发触发两次 | 看 `Agent版本` 字段，已写就跳过。 |
| 任何意外 | 停止操作，把现状写到 `openclaw_output/error_log.md`，commit 一次，等人来看。**不要静默失败**。 |

---

## 6. 强约束 Checklist（每条 run 完都要自己过一遍）

- [ ] `scorecard` 数组正好 8 个维度
- [ ] 每个维度的 score 是 满分/0.6×满分/0.3×满分 三档之一
- [ ] `decision_summary.agent_version` = `v1.1.0`
- [ ] `decision_summary.next_agent` 是数组
- [ ] `decision_summary.cross_tier_review_required` 显式 true/false
- [ ] 所有 `matched_module_id` 能在 07/09 CSV grep 到，或是 `需人工确认`
- [ ] `01.Agent版本` 字段写了 `v1.1.0`
- [ ] `01.跨档触发二审` checkbox 跟 JSON 一致
- [ ] 02/03/04/05 表都按预期插入了
- [ ] commit 了一次
- [ ] 没有把 token / app_secret / API key 写进任何 commit 文件
- [ ] **字段值已按 `agent_output_to_feishu_mapping.md` 映射**（next_agent / target_agent 去后缀；module_impact_on_initiation 转 enum；user 字段不写）

---

## 7. 永远不要做的事

1. 不要修改 `product_initiation_agent.yaml` / `sop.md` / `feishu_tables.md` / `input_schema.json` / `output_schema.json` —— 这些是业务定义，人类拍的。
2. 不要编 `matched_module_id`。查不到就填 `需人工确认`。
3. 不要给小数分（比如 12.5）。锚点只允许三档。
4. 不要把 `next_agent` 写成字符串。必须数组。
5. 不要静默失败。任何报错都要写进 `openclaw_output/error_log.md`。
6. 不要把 base_token / app_secret / DeepSeek key commit 进仓库。
7. 不要在飞书表外发任何评论 / 通知 / 邮件 —— 你只在飞书表里写数据。

---

## 8. 第一次跑（onboarding 用）

按以下顺序走一遍，每完成一步在浏览器里告诉操作员：

1. **读这份 runbook + `product_initiation_agent.yaml` + `output_schema.json`**，回答"我已理解任务"。
2. **跑一次 dry-run**：用 `example_input.json` 当输入，**不写飞书**，只产出 `openclaw_output/runs/dryrun_<timestamp>/{report.md, output.json}`。让操作员对照 `example_output.md` 看输出对不对。
3. **dry-run 通过后**，跑一次 `01_产品立项池` 的第一条真实记录（操作员会告诉你 record_id），**走完整 §3 流程**。
4. **真实记录跑完后**，操作员人工 review 飞书里的回写结果。OK 就配定时任务，每 5 分钟跑一次。

---

> 这份 runbook 是 v1.0.0。后续如果发现 K2.6 在某类立项上判断不稳，
> 在 `openclaw_output/runbook_revisions.md` 记录修订原因 + 改动，
> 再升 v1.0.1 / v1.1.0 等。
