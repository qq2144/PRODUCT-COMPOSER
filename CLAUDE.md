# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要：本项目刚刚发生过方向重构（2026-05-29）

提交 `7e79232 refactor: 剪枝立项专家方向，重开产品组合器方向` 之后，本仓库的路线已经从“立项专家 / 飞书多维表 / AI 评分卡 / 任务分发”整体转向“**产品组合器 = 产品资产录入 + 模块组合工作台**”。

[产品组合器_v1.md](产品组合器_v1.md) 是当前**唯一权威**的路线文档。在做任何重构、新增或建议之前都应当读它。

**不要恢复**以下任何方向，即使在 git 历史或残留文件中看到它们：

- 飞书 01-06 多维表（产品立项池 / 模块预检 / 评分卡 / 路径输出 / 任务分发 / 立项复盘）
- 立项专家 Agent SOP / runbook
- AI 评分卡和打分锚点
- openclaw 建表脚本（`create_feishu_tables.js` 等）
- “让用户填一堆字段，再让 AI 判定要不要做项目”这一整套交互

`archive/` 下旧资产正在被删除，HEAD 还能看到，但工作区里它们都已 `D`（staged delete）。删除是有意的。

## 工作目录与 PowerShell 注意事项

- 主工作目录路径里含中文（`D:\1.work\5-20\RawData\货盘`、`产品组合器_v1.md` 等）。在 PowerShell 中传路径请加双引号。
- Bash 工具下中文路径会被 ls 错误转义，遇到时切到 Read/Glob/Grep 等专用工具。

## 数据模型（产品组合器的底座）

`data/` 下 4 个 CSV 是当前项目的全部数据底座，使用 **UTF-8 with BOM** 编码（Excel 双击不乱码）：

| 文件 | 角色 | 来源 |
|---|---|---|
| `module_library_fields.csv` | 模块库的字段 schema（15 列：编号、维度、归属品牌、状态、负责人、确认状态…） | 手工定义 |
| `module_library_seed.csv` | 人工确认的模块种子（TMP-001 起，沿用上表 schema） | 访谈 / 复盘 |
| `discovered_modules.csv` | 货盘脚本用关键词自动挖出的模块**候选**（TMP-PAL-* 前缀），需要负责人确认后才能并入 seed | `sediment_pallet.py` 输出 |
| `product_assets.csv` | 产品/SKU 资产扁平表（品类 × 二级品类 × 版型 × 代际 × 品牌 → 货号/销量/升级情况/竞品链接） | `sediment_pallet.py` 输出 |

`discovered_modules` 和 `module_library_seed` 共用同一份 schema（见 `module_library_fields.csv`），区别只是“是否经人工确认”。脚本写入前者，人工评审后转入后者。

### 六类模块维度（产品组合器的契约）

任何 AI 输出或代码里描述“一个产品”都必须用这 6 个维度：**版型 / 材料 / 结构 / 外观 / 功能 / 包装**。`module_library_fields.csv` 给“待归类”作为兜底；`sediment_pallet.py` 的 `MODULE_KEYWORDS` 字典是当前唯一的关键词词库，扩展词库时改它。

### 五个意图维度（自然语言入口的契约）

用户自然语言想法 → 解析为：**品类 / 用户场景 / 功能感受 / 品牌资产 / 风格调性**。这 5 维和上面 6 维之间的映射，是组合器的核心算法（v1 尚未实现，是下一步工作）。详见 [产品组合器_v1.md](产品组合器_v1.md) 第二、三节。

### 品牌枚举

`sediment_pallet.py` 中 `KNOWN_BRANDS = {"TMT", "SERUNA", "JAFFICK", "ANTA"}` 是货盘列头解析的依据；`module_library_seed.csv` 还出现 `奈肤 Silk-Skin`、`JFK`、`通用` 等。新品牌进入工作流时两边都要更新。

## 货盘沉淀脚本

`RawData/货盘/sediment_pallet.py` 是当前**唯一**的 ETL 脚本。

### 已知的路径配置漂移（重要）

脚本顶部：
```python
SRC_DIR = r"D:\1.work\5-20\货盘"      # 不存在！实际在 RawData/货盘
OUT_DIR = r"D:\1.work\5-20\data"      # OK
```

`.gitignore` 里 `货盘/*.xlsx` 也基于旧路径。两处都还没改。**运行前要么修脚本的 `SRC_DIR`，要么直接命令行注入**，例如：

```powershell
$env:PYTHONIOENCODING="utf-8"; python "RawData\货盘\sediment_pallet.py"
# 或临时改：
python -c "import sediment_pallet as s; s.SRC_DIR=r'D:\1.work\5-20\RawData\货盘'; s.main()"
```

### 脚本的关键行为（修改前务必知道）

- 用 `openpyxl` 只读模式打开；`pick_latest_month_sheet()` 用正则匹配 `26年04月 / 2026.04` 这种 sheet 名，取最新月份的那张。
- `find_header_row()` 在前 5 行内搜“一级品类”这个字面值定位表头；任何货盘新模板都要保留这个列名。
- `classify_columns()` 根据 `KNOWN_BRANDS` 把品牌列认出来；`细分品类（按版型）` 之后到第一个品牌列之间，隐式推断为“代际、字段名”两列。这是货盘格式的硬约定，模板换了就会 `[skip]`。
- 货盘是“字段名 × 品牌”的矩阵布局（字段名行有“货号 / 销量 / 升级情况 / 图片”），脚本把它**转置**成 SKU 扁平行。
- 模块发现走 `MODULE_KEYWORDS` 关键词匹配；命中即生成 `TMP-PAL-{品类前2字}-{序号}` 临时编号，状态根据是否有源货号判“已量产/概念”。
- 写盘用 `utf-8-sig`（带 BOM）— 替换写法时不要丢 BOM，否则 Excel 中文会乱码。

## 命令

```powershell
# 安装唯一的运行时依赖
pip install openpyxl

# 跑货盘沉淀（注意：先解决上面的 SRC_DIR 漂移）
python "RawData\货盘\sediment_pallet.py"
```

没有测试、构建、lint 脚本。所有“产物”就是 `data/*.csv`，验收靠人工读 CSV / 脚本最后的沉淀报告。

## 重要文档

- [产品组合器_v1.md](产品组合器_v1.md) — **权威路线**。机会判断逻辑（爆品升级 / 竞品升级 / 品类地图缺失 / 品牌迁移 / 未起量迭代）的 5 条判定准则在此。AI 提示词骨架（必须输出的 JSON 字段：parsed_intent / matched_modules / asset_comparison / opportunity_label / reasoning / concept_card）也在此。
- [README.md](README.md) — 简短的项目说明和双入口边界（产品部 vs 运营提案）。
- [RawData重建产品资产方案.md](RawData重建产品资产方案.md) — **提案，未执行**。建议把 `product_assets.csv` 的来源从“货盘”改为“`RawData/Product Monthly Sales File/4月销量汇总表.xlsx`”（SKU 主表），把货盘只用于品类地图/竞品情报。要动 `product_assets.csv` 的结构前先和用户对齐这份提案。

## 沉淀原则（来自路线文档）

- 先录资产再谈 AI：没有 `product_assets.csv` 和 `module_library` 时 AI 不能凭空判断。
- 判断必须可追溯：任何 “爆品升级 / 竞品升级 / 品类缺失 / 未起量诊断” 结论都要引用 SKU/模块/销量/竞品作为证据，不能只给结论。
- AI 不判生死：AI 负责解析、匹配、解释、生成草案，**不做评分、不做审批、不做任务分发**。
- 新内容必须带作者标签回流模块库（`负责人` + `收集时间` + `收集来源` + `确认状态`）。
