# AI 输出 → 飞书字段 映射表（v1.0.1 补丁）

> 配合 `agent_runbook.md` v1.0.1 使用。
>
> **背景**：dry-run 阶段发现 `output_schema.json` 跟飞书表字段 schema 有 3 处不一致；
> 直接把 output.json 喂给 lark-cli 会被飞书拒掉（option not in enum / invalid user）。
> 这份文档定义"AI 输出 → 飞书写入"中间必须做的预处理。
>
> **不要去改业务定义文件**（output_schema.json / example_output.md / feishu_tables.md）——
> 那是党英轩拍板的规则。这份 mapping 是补丁层，等业务定义升版时再合并。

---

## 1. next_agent / target_agent —— 去"智能体"后缀

### 命中位置
- `output.json` → `decision_summary.next_agent[]` → 写 **01 表「下一步智能体」**（multi_select）
- `output.json` → `task_dispatch[].target_agent` → 写 **05 表「目标智能体」**（multi_select）

### 映射规则
逐项查表，**飞书侧的 option 没有"智能体"后缀**：

| AI 输出值 | 写飞书的值 |
|---|---|
| 品类增长智能体 | 品类增长 |
| 产品模块化智能体 | 产品模块化 |
| 品牌资产植入智能体 | 品牌资产 |
| 材料创新智能体 | 材料创新 |
| 供应链打样智能体 | 供应链打样 |
| 内容短视频智能体 | 内容短视频 |
| 财务测算智能体 | 财务测算 |

### 处理方式
写 lark-cli 之前，对这两个字段统一执行 `value.replace("智能体", "").replace("植入", "").trim()`，
**然后逐项校验**是否在上述 7 个 option 之一。
不在的话填 `需人工确认`（如果 multi_select 不接受这个值，就跳过这条 value）。

---

## 2. module_impact_on_initiation —— 自由文本 → 枚举

### 命中位置
- `output.json` → `module_precheck.modules[].module_impact_on_initiation`（自由 string）
- 写 **02 表「对立项影响」**（select，6 个 enum）

### 映射规则
读自由文本，**按以下顺序匹配关键词**（短路），落到对应 enum：

| 优先级 | 关键词 | 落到 enum |
|---|---|---|
| 1 | "需新增" / "缺失" / "无现有" / "风险" / "无法验证" | 增加风险 |
| 2 | "构成核心差异" / "差异化" / "独特性" / "卖点" | 构成核心差异 |
| 3 | "快速升级" / "可支持小样" / "可改良" / "升级理由" | 支撑快速升级 |
| 4 | "降低难度" / "降低打样" / "更简单" / "已量产可直接用" | 降低开发难度 |
| 5 | "不影响" / "无关" / "可忽略" | 不影响 |
| 兜底 | 都不命中 | 需人工确认 |

### 同时保留原文
飞书 02 表的「缺失信息」字段（长文本）追加一段：
```
原始判断：<AI 自由文本>
```
这样人工 review 时还能看到 AI 的本意，select 字段不丢失语境。

---

## 3. user 字段：名字 → user_id（Round 3 真实写飞书才触发）

### 命中位置
- 05 表「负责人」/ 「协同人」（user 字段）
- 02 表「模块负责人」（user 字段）
- 03 表「负责人」（user 字段）
- 06 表「复盘负责人」（user 字段）
- 01 表「提交人」/「产品负责人」/「代理决策人」（user 字段——这些 AI 不会写，跳过）

### 短期处理（v1.0.1 补丁阶段）
**Round 3 暂不写 05 表的 user 字段，只写文本字段**：
- `lark-cli +record-create` 写 05 表时，**故意不传**「负责人」「协同人」字段
- 飞书侧字段留空，党英轩或运营人工点选
- 这样不阻塞主链路

同样适用于 02 表「模块负责人」、03 表「负责人」。

### 长期处理（Demo 通过后做）
建立一份本地 `name_to_userid.json` 映射表：
```json
{
  "党英轩": "ou_xxx...",
  "曹树洋": "ou_xxx...",
  "黄学善": "ou_xxx...",
  "那日苏": "ou_xxx..."
}
```
通过 `lark-cli contact +user-list` 或飞书后台 API 获取 user_id。
之后所有 user 字段写入时查这张表。

---

## 4. owner 含斜杠组合（"党英轩/黄学善"）

### 命中位置
- `task_dispatch[].owner`
- `risk_list[].owner`

### 映射规则
按 `/` 拆数组，取**第一个**作为主负责人写「负责人」字段，
其余的写「协同人」字段（如果 05 表「协同人」用户字段策略允许）。

Round 3 阶段「负责人」/「协同人」都暂不写，所以这条规则**先记着，先不实施**。

---

## 5. 写飞书前的预处理流程（伪代码）

```python
def to_feishu(output_json):
    payload_01 = {
        "立项前模块复用率": output.decision_summary.estimated_module_reuse_rate,
        "模块闸口结论":   output.decision_summary.module_gate_result,
        "AI判断项目类型":  output.decision_summary.project_type,
        "立项总分":       output.decision_summary.total_score,
        "推荐动作":       output.decision_summary.recommendation,
        "最大机会":       output.decision_summary.biggest_opportunity,
        "最大风险":       output.decision_summary.biggest_risk,
        "人工确认点":     "\n".join(output.decision_summary.manual_confirmation_required),
        "下一步智能体":   [strip_agent_suffix(a) for a in output.decision_summary.next_agent],
        "Agent版本":      output.decision_summary.agent_version,
        "跨档触发二审":   output.decision_summary.cross_tier_review_required,
        # "当前状态": 由 recommendation 推出（见下方）
    }
    payload_01["当前状态"] = recommendation_to_status(output.decision_summary.recommendation)

    # 02 表（每个模块维度一条）
    for m in output.module_precheck.modules:
        payload_02 = {
            "预判ID":     f"MPRE-{output.decision_summary.initiation_id}-{idx}",
            "立项ID":     output.decision_summary.initiation_id,
            "模块维度":   m.module_dimension,
            "预期模块":   m.expected_module,
            "匹配状态":   m.match_status,
            "匹配模块ID": m.matched_module_id,
            "预估复用率": m.reuse_rate,
            "对立项影响": map_module_impact(m.module_impact_on_initiation),  # ← 映射
            "缺失信息":   ", ".join(m.unknowns) + f"\n原始判断：{m.module_impact_on_initiation}",
            # 模块负责人字段：v1.0.1 阶段不写
        }

    # 03 表（每个评分维度一条）
    for s in output.scorecard:
        payload_03 = {
            "评分ID":    f"SCORE-{output.decision_summary.initiation_id}-{idx}",
            "立项ID":    output.decision_summary.initiation_id,
            "评分维度":  s.dimension,
            "满分":      s.max_score,
            "得分":      s.score,
            "评分理由":  s.reason,
            "需人工确认": ", ".join(s.unknowns),
            # 负责人字段：v1.0.1 阶段不写
        }

    # 04 表（一条路径产出）
    # 按 project_type 取对应的 output 子对象，逐字段映射

    # 05 表（每条任务一条）
    for t in output.task_dispatch:
        payload_05 = {
            "任务ID":   f"TASK-{output.decision_summary.initiation_id}-{idx}",
            "立项ID":   output.decision_summary.initiation_id,
            "任务名称": t.task_name,
            "任务类型": infer_task_type(t),  # 见下方
            "截止时间": t.deadline,
            "输出物":   t.output,
            "目标智能体": [strip_agent_suffix(t.target_agent)],  # ← 数组,映射
            "任务状态": "待开始",
            # 负责人/协同人：v1.0.1 阶段不写
        }
```

### 工具函数

```python
def strip_agent_suffix(name: str) -> str:
    # "品牌资产植入智能体" → "品牌资产"
    # "产品模块化智能体" → "产品模块化"
    valid = {"品类增长", "产品模块化", "品牌资产", "材料创新",
             "供应链打样", "内容短视频", "财务测算"}
    s = name.replace("智能体", "").replace("植入", "").strip()
    return s if s in valid else "需人工确认"

def recommendation_to_status(rec: str) -> str:
    return {
        "建议立项":     "已建议立项",
        "小样测试":     "小样测试",
        "暂缓补资料":   "暂缓",
        "不建议立项":   "放弃",
        "止损":         "放弃",
    }.get(rec, "待补资料")

def map_module_impact(text: str) -> str:
    rules = [
        (["需新增", "缺失", "无现有", "风险", "无法验证"], "增加风险"),
        (["构成核心差异", "差异化", "独特性", "卖点"],     "构成核心差异"),
        (["快速升级", "可支持小样", "可改良", "升级理由"], "支撑快速升级"),
        (["降低难度", "降低打样", "更简单", "可直接用"],   "降低开发难度"),
        (["不影响", "无关", "可忽略"],                     "不影响"),
    ]
    for keywords, enum_val in rules:
        if any(k in text for k in keywords):
            return enum_val
    return "需人工确认"

def infer_task_type(t) -> str:
    # 按 target_agent 推任务类型
    return {
        "品类增长":   "品类",
        "产品模块化": "产品",
        "品牌资产":   "品牌",
        "材料创新":   "材料",
        "供应链打样": "供应链",
        "内容短视频": "内容",
        "财务测算":   "财务",
    }.get(strip_agent_suffix(t.target_agent), "产品")
```

---

## 6. v1.0.1 调整在 runbook 中的位置

`agent_runbook.md` 的下列章节需要按本补丁执行：

| runbook 章节 | 怎么改 |
|---|---|
| §3 Step 9 回写飞书 | 调 lark-cli 之前先按本文 §5 跑预处理 |
| §4.3 更新 01 表样板 | 把 next_agent 字段值替换为去后缀版本 |
| §4.4 写 02 表 | 「对立项影响」字段用 `map_module_impact()` 转 enum；user 字段不写 |
| §4.5 写 03 表 | 「负责人」user 字段不写 |
| §4.7 写 05 表 | 「目标智能体」按 mapping 转；「负责人」/「协同人」user 字段不写 |
| §6 Checklist | 新增一条：「字段值已按 mapping 映射」 |

---

## 7. 不在本补丁范围内的事

- 修复 `output_schema.json` 中 `module_impact_on_initiation` 的 string vs enum 分歧 —— 业务定义级别的事，等 v1.2.0
- 修复 `example_output.md` 中 next_agent 带"智能体"后缀 —— 同上
- 飞书 02-06 表的「立项ID」从 text 改成真关联字段 —— Demo 通过后做
- name_to_userid.json 映射 —— Demo 通过后做
