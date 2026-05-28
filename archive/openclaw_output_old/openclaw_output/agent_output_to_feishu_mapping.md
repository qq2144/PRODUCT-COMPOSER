# AI 输出 → 飞书字段 映射表（v1.0.2 补丁）

> **v1.0.2 变更**：新增 §3「table_04 path_output 字段映射」、§4「table_02 下一步动作填法」
> —— Round 2.5 第二次审计发现 04 表字段大面积对不上飞书 schema，本补丁修。
>
> **v1.0.1 变更**：§2「module_impact_on_initiation」改为直接由 match_status 映射。

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

## 2. module_impact_on_initiation —— 由 match_status 直接映射（v1.0.1 修订）

### 命中位置
- 写 **02 表「对立项影响」**（select，6 个 enum）
- 数据源：`output.json` → `module_precheck.modules[].match_status`（**不是** `module_impact_on_initiation` 自由文本）

### 为什么不用自由文本做关键词匹配
首版用关键词匹配自由文本，dry-run 暴露两个问题：
- "降低品牌化设计难度，但山型符号结构化版本未验证" —— 同时命中正向和负向关键词，按优先级短路会丢真实意图
- "可快速形成品牌可信感" —— 关键词表覆盖不到，兜底为"需人工确认"，但实际是"降低开发难度"

AI 已经在 `match_status` 字段做了 5 选 1 的 enum 决策，**这才是更稳的语义信号**。
直接映射，不做反推。

### 映射规则

| AI 输出 match_status | 写飞书 02 表「对立项影响」 |
|---|---|
| 可复用 | 降低开发难度 |
| 可改良 | 支撑快速升级 |
| 需新增 | 增加风险 |
| 无效/禁用 | 增加风险 |
| 需人工确认 | 需人工确认 |

> 注意：飞书 02 表 enum 还有「构成核心差异」「不影响」两个值，但 match_status 没有对应概念，
> v1.0.1 阶段不主动落到这两个值。等业务定义升版时再补。

### 自由文本去哪
`module_impact_on_initiation` 整段拼到飞书 02 表「缺失信息」字段末尾：

```
缺失信息: <unknowns 数组逗号拼接>
原始判断: <module_impact_on_initiation 原文>
```

这样人工 review 时既能看到 select 结论，又能看到 AI 的原始语境。

---

## 3. table_04 path_output → 飞书 04 表字段映射（v1.0.2 新增）

### 问题
`output_schema.json` 中 `path_output.competitor_upgrade_output / hit_product_upgrade_output / underperforming_product_diagnosis / category_missing_output`
是 type:object 的开放结构，AI 按自己理解写字段名（why_users_buy / brand_upgrade_direction 等）。

但飞书 04 表是**固定 18 列 schema**：

```
路径产出ID, 立项ID, 项目类型,
品类机会判断, 竞品池, 价格带分析, 首发单品建议,
用户购买原因, 竞品不足, 我们的升级方向,
可复用模块, 需新增模块, 模块驱动立项理由,
爆品成立原因, 可放大模块,
未起量原因诊断,
处理建议
```

写飞书前必须做"AI 字段名 → 飞书字段名"的二次映射。

### 映射规则（按 project_type 分支）

#### 共用字段（4 类项目都写）

| 飞书 04 表字段 | 数据来源 |
|---|---|
| 路径产出ID | 自生成：`PATH-{initiation_id}-001` |
| 立项ID | `decision_summary.initiation_id` |
| 项目类型 | `decision_summary.project_type` |
| 可复用模块 | 把 `module_precheck.modules` 中 match_status=可复用/可改良 的 `expected_module` 用、拼接 |
| 需新增模块 | `module_precheck.missing_core_modules` 数组用、拼接 |
| 模块驱动立项理由 | `module_precheck.module_based_initiation_reason` 加一句 `module_precheck.recommended_module_next_action` |

#### 竞品产品升级（competitor_upgrade_output）

| 飞书 04 表字段 | 数据来源 |
|---|---|
| 用户购买原因 | `why_users_buy_competitors` |
| 竞品池 | `problems_competitors_solve`（竞品解决什么问题视作竞品池摘要的补充）。如果 `decision_summary.manual_confirmation_required` 里有"竞品池"，那就填"需人工确认" |
| 价格带分析 | （AI 输出里没有，留空或"需人工确认"） |
| 竞品不足 | `competitor_shortcomings` |
| 我们的升级方向 | 拼接 4 行：「品牌升级：{brand_upgrade_direction}」「材料升级：{material_upgrade_direction}」「结构升级：{structure_upgrade_direction}」「供应链：{supply_chain_upgrade_direction}」。每行一段，用 `\n` 分隔。再追加"外观差异化：{appearance_differentiation}" / "功能差异化：{function_differentiation}" / "卖点差异化：{detail_page_selling_point_differentiation}" |
| 处理建议 | 留空（飞书 04 表「处理建议」select 的 enum 是"重新立项/内容优化/品牌化涂装/成本优化/渠道切换/止损/需人工确认"，**主要给未起量产品升级用**。竞品升级项目这个字段无对应 → 不写或"需人工确认"） |

#### 品类地图缺失（category_missing_output）

| 飞书 04 表字段 | 数据来源 |
|---|---|
| 品类机会判断 | `category_opportunity_judgment` |
| 竞品池 | `competitor_pool` |
| 价格带分析 | `price_band_analysis` |
| 首发单品建议 | `first_sku_recommendation` |
| 我们的升级方向 | 拼接 `brand_entry_approach` + `transferable_modules` |
| 处理建议 | "需人工确认" 或留空 |

#### 现有爆品升级（hit_product_upgrade_output）

| 飞书 04 表字段 | 数据来源 |
|---|---|
| 爆品成立原因 | `why_hit_works` |
| 可放大模块 | `scalable_modules` |
| 我们的升级方向 | 拼接 `material/structure/appearance/packaging/combination/channel_upgrade_directions` |
| 处理建议 | 留空 |

#### 未起量产品升级（underperforming_product_diagnosis）

| 飞书 04 表字段 | 数据来源 |
|---|---|
| 未起量原因诊断 | 拼接所有诊断字段（`product_definition_diagnosis / price_band / channel_match / selling_point / visual / supply_chain_cost / category_demand`），每行一段 |
| 我们的升级方向 | `replaceable_module_analysis`（可替换模块部分） |
| 处理建议 | `handling_recommendation`（这个 enum 跟飞书表 select 一致：重新立项/内容优化/品牌化涂装/成本优化/渠道切换/止损） |

### 字段不存在的处理
不属于当前 project_type 的字段（比如竞品升级项目就没有"品类机会判断"）→ **不写**，由飞书侧自动留空。

---

## 4. table_02 下一步动作填法（v1.0.2 新增）

### 问题
飞书 02 表有「下一步动作」text 字段，但 output_schema.json `module_precheck.modules[]` 没对应字段
（只有顶层 `recommended_module_next_action`，是综合的一句）。

### 映射规则
按 `match_status` 给每条 02 表记录的「下一步动作」字段填一个固定值：

| match_status | 02 表「下一步动作」 |
|---|---|
| 可复用 | 直接进入打样/复用，无需额外动作 |
| 可改良 | 进入产品模块化智能体复核改良方向 |
| 需新增 | 进入产品模块化智能体定义新模块 |
| 无效/禁用 | 排除该模块，不进入下一步 |
| 需人工确认 | 等待人工补全信息 |

### 同时把综合动作写到 01 表
顶层 `module_precheck.recommended_module_next_action` 已经在 01 表「人工确认点」字段间接体现，
**不重复写**。

---

## 5. user 字段：名字 → user_id（Round 3 真实写飞书才触发）

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

## 6. owner 含斜杠组合（"党英轩/黄学善"）

### 命中位置
- `task_dispatch[].owner`
- `risk_list[].owner`

### 映射规则
按 `/` 拆数组，取**第一个**作为主负责人写「负责人」字段，
其余的写「协同人」字段（如果 05 表「协同人」用户字段策略允许）。

Round 3 阶段「负责人」/「协同人」都暂不写，所以这条规则**先记着，先不实施**。

---

## 7. 写飞书前的预处理流程（伪代码）

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
            "对立项影响": map_module_impact_by_status(m.match_status),  # ← §2
            "缺失信息":   ", ".join(m.unknowns) + f"\n原始判断：{m.module_impact_on_initiation}",
            "下一步动作": map_module_next_action(m.match_status),       # ← §4 v1.0.2 新增
            # 模块负责人字段：v1.0.x 阶段不写
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

    # 04 表（一条路径产出）—— v1.0.2 修订：用 §3 的固定字段表
    payload_04 = build_table_04_payload(output)  # 见下方

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

def map_module_next_action(match_status: str) -> str:
    # v1.0.2 新增：02 表「下一步动作」字段值
    return {
        "可复用":      "直接进入打样/复用，无需额外动作",
        "可改良":      "进入产品模块化智能体复核改良方向",
        "需新增":      "进入产品模块化智能体定义新模块",
        "无效/禁用":   "排除该模块，不进入下一步",
        "需人工确认":  "等待人工补全信息",
    }.get(match_status, "等待人工补全信息")

def build_table_04_payload(output):
    # v1.0.2 新增：04 表字段固定 18 列，按 project_type 分支填
    initiation_id = output.decision_summary.initiation_id
    project_type  = output.decision_summary.project_type
    reusable_mods = [m.expected_module for m in output.module_precheck.modules
                     if m.match_status in ("可复用", "可改良")]

    payload = {
        "路径产出ID":   f"PATH-{initiation_id}-001",
        "立项ID":       initiation_id,
        "项目类型":     project_type,
        "可复用模块":   "、".join(reusable_mods),
        "需新增模块":   "、".join(output.module_precheck.missing_core_modules),
        "模块驱动立项理由": (
            f"{output.module_precheck.module_based_initiation_reason}。"
            f"{output.module_precheck.recommended_module_next_action}"
        ),
    }

    p = output.path_output
    if project_type == "竞品产品升级" and p.get("competitor_upgrade_output"):
        c = p["competitor_upgrade_output"]
        payload["用户购买原因"]     = c.get("why_users_buy_competitors", "")
        payload["竞品池"]           = c.get("problems_competitors_solve", "")
        payload["竞品不足"]         = c.get("competitor_shortcomings", "")
        payload["我们的升级方向"]   = "\n".join(filter(None, [
            f"品牌升级：{c.get('brand_upgrade_direction','')}",
            f"材料升级：{c.get('material_upgrade_direction','')}",
            f"结构升级：{c.get('structure_upgrade_direction','')}",
            f"供应链：{c.get('supply_chain_upgrade_direction','')}",
            f"外观差异化：{c.get('appearance_differentiation','')}",
            f"功能差异化：{c.get('function_differentiation','')}",
            f"卖点差异化：{c.get('detail_page_selling_point_differentiation','')}",
        ]))
        # 处理建议留空（这个 select 主要给"未起量升级"用）

    elif project_type == "品类地图缺失" and p.get("category_missing_output"):
        c = p["category_missing_output"]
        payload["品类机会判断"]   = c.get("category_opportunity_judgment", "")
        payload["竞品池"]         = c.get("competitor_pool", "")
        payload["价格带分析"]     = c.get("price_band_analysis", "")
        payload["首发单品建议"]   = c.get("first_sku_recommendation", "")
        payload["我们的升级方向"] = "\n".join(filter(None, [
            c.get("brand_entry_approach", ""),
            "可迁移模块：" + str(c.get("transferable_modules", "")),
        ]))

    elif project_type == "现有爆品升级" and p.get("hit_product_upgrade_output"):
        c = p["hit_product_upgrade_output"]
        payload["爆品成立原因"]   = c.get("why_hit_works", "")
        payload["可放大模块"]     = c.get("scalable_modules", "")
        payload["我们的升级方向"] = "\n".join(filter(None, [
            c.get("material_upgrade_direction", ""),
            c.get("structure_upgrade_direction", ""),
            c.get("appearance_upgrade_direction", ""),
            c.get("packaging_upgrade_direction", ""),
            c.get("combination_upgrade_direction", ""),
            c.get("channel_upgrade_direction", ""),
        ]))

    elif project_type == "未起量产品升级" and p.get("underperforming_product_diagnosis"):
        c = p["underperforming_product_diagnosis"]
        payload["未起量原因诊断"] = "\n".join(filter(None, [
            f"产品定义：{c.get('product_definition_diagnosis','')}",
            f"价格带：{c.get('price_band','')}",
            f"渠道：{c.get('channel_match','')}",
            f"卖点：{c.get('selling_point','')}",
            f"视觉：{c.get('visual','')}",
            f"供应链/成本：{c.get('supply_chain_cost','')}",
            f"品类需求：{c.get('category_demand','')}",
        ]))
        payload["我们的升级方向"] = c.get("replaceable_module_analysis", "")
        if c.get("handling_recommendation"):
            payload["处理建议"]   = c["handling_recommendation"]

    return payload

def map_module_impact_by_status(match_status: str) -> str:
    # v1.0.1 修订：直接从 match_status 映射，不再用 free-text 关键词反推。
    # 原因：AI 已经在 match_status 字段做了 enum 决策，那才是更稳的语义信号。
    return {
        "可复用":      "降低开发难度",
        "可改良":      "支撑快速升级",
        "需新增":      "增加风险",
        "无效/禁用":   "增加风险",
        "需人工确认":  "需人工确认",
    }.get(match_status, "需人工确认")

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

## 8. mapping 调整在 runbook 中的位置

`agent_runbook.md` 的下列章节需要按本补丁执行：

| runbook 章节 | 怎么改 |
|---|---|
| §3 Step 9 回写飞书 | 调 lark-cli 之前先按本文 §7 跑预处理 |
| §4.3 更新 01 表样板 | 把 next_agent 字段值替换为去后缀版本（§1） |
| §4.4 写 02 表 | 「对立项影响」用 `map_module_impact_by_status()`（§2）；「下一步动作」用 `map_module_next_action()`（§4）；user 字段不写 |
| §4.5 写 03 表 | 「负责人」user 字段不写 |
| §4.6 写 04 表 | **字段名按 §3 的固定 18 列 schema 重写**，不要用 AI 自由字段名 |
| §4.7 写 05 表 | 「目标智能体」按 §1 mapping 转；「负责人」/「协同人」user 字段不写 |
| §6 Checklist | 新增「字段值已按 mapping 映射」「04 表用固定 schema 字段名」 |

---

## 9. 不在本补丁范围内的事

- 修复 `output_schema.json` 中 `module_impact_on_initiation` 的 string vs enum 分歧 —— 业务定义级别的事，等 v1.2.0
- 修复 `example_output.md` 中 next_agent 带"智能体"后缀 —— 同上
- 飞书 02-06 表的「立项ID」从 text 改成真关联字段 —— Demo 通过后做
- name_to_userid.json 映射 —— Demo 通过后做
