# README - 给 openclaw 的导览文档

> 你（openclaw / Kimi K2）拿到这个仓库后，**先读完本文件再开干**。

## 这是什么仓库

淘玛特品牌产品增长中心的「立项专家」AI Agent 项目。
目标：把所有产品机会，统一纳入"可判断、可评分、可分发、可复盘"的立项系统。
你在这套系统里的两层身份：

1. **建表助手** —— 用飞书 CLI 在飞书里创建多维表 + 配置自动化
2. **立项专家 Agent 本体** —— 当飞书 01 表新增立项时被调用，加载 `product_initiation_agent.yaml` 跑判断

当前阶段：身份 1。

## 文件地图

| 文件 | 是什么 | 你要怎么用 |
|---|---|---|
| `product_initiation_agent.yaml` | Agent 人设 + 规则 + 评分锚点 | 身份 2 阶段加载为 system_prompt |
| `sop.md` | 立项 SOP 业务流程 | 知识库 |
| `feishu_tables.md` | **6 张飞书多维表的字段定义** | **建表的权威依据** |
| `input_schema.json` | 立项专家输入字段 JSON Schema | 校验输入 |
| `output_schema.json` | 立项专家输出字段 JSON Schema | 校验你的输出 |
| `example_input.json` | 示例输入 | 跑通后回归用 |
| `example_output.md` | 示例完整输出 | 学习输出格式 |
| `feishu_import/01-06_*.csv` | 6 张飞书表的字段定义快照 | 建表时辅助参考 |
| `feishu_import/07_module_library_intake*.csv` | 模块库表 + 8 条种子数据 | 需要新建一张「07_模块库」表并导入 |
| `feishu_import/08_pallet_flat.csv` | 货品/竞品池 205 行 | 新建「08_货品池」表并导入 |
| `feishu_import/09_pallet_modules_discovered.csv` | 货盘挖出的 102 条模块候选 | 追加导入到「07_模块库」 |
| `货盘/sediment_pallet.py` | 货盘 xlsx 沉淀脚本 | 下个月新货盘来了重跑 |

> ⚠️ `货盘/*.xlsx` **未入库**（太大）。你需要操作货盘原始数据时跟人类要。

## 你的产出放哪儿

请把**你产生的所有产物**统一放到 `openclaw_output/` 目录下，不要污染根目录。
例如：
- `openclaw_output/feishu_assets.md` —— 建好的飞书侧资产清单
- `openclaw_output/验证报告_YYYY-MM-DD.md` —— dry-run 报告
- `openclaw_output/automation_configs.json` —— 自动化备份

## 提交规范

每完成一项任务就 commit + push 一次：

```bash
git add -A
git commit -m "<阶段>: <做了什么> by openclaw"
git push origin master
```

commit 前缀建议：
- `setup:` 建表、配自动化
- `seed:` 导入种子数据
- `eval:` 跑回归
- `fix:` 修问题
- `doc:` 写资产清单/报告

## 永远不要做的事

1. 不要修改 `feishu_tables.md` / `product_initiation_agent.yaml` 这些"业务定义"文件
   —— 那是人类决策。你只能读、不能改。
2. 不要把任何 token、key、密码 commit 进仓库（看 `.gitignore` 已忽略 .env 等）
3. 不要编造模块 ID 或字段名 —— 不确定就在产出里标 `需人工确认`
4. 不要静默失败 —— 任何报错都要写进 `openclaw_output/error_log.md`
