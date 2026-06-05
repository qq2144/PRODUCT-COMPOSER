# 淘玛特产品组合器（Product Composer）

> 状态：**v1.2 内测就绪** · 4 人内测中 · 单仓 Svelte 5 + Fastify + DeepSeek

产品部 4 人共用的新品构思工作台：一句话产品想法 → AI 解析 5 维度 → 匹配模块 → 同品类资产对照 → 概念卡。

**不是**立项审批、评分卡、飞书多维表系统。AI 负责解析/匹配/解释/草案，不做评分、不做审批、不判生死。

## 在线演示

把仓库 clone 下来，`pnpm i && pnpm dev`，浏览器开 `http://localhost:5174`，注册激活码 `TMT6886`（4 人内测共用、永久有效）即可。

## 核心功能（8 个页面）

| 页面 | 一句话功能 |
|---|---|
| 登录 / 注册 | 激活码注册 + bcrypt + 签名 cookie 鉴权 |
| **驾驶舱** | 6 指标 + 本月活动 + 模块引用 TOP 5 |
| **组合器（核心）** | 自然语言 → LLM 解析 5 维度 → 6 类模块匹配 → 概念卡草案 |
| 概念卡库 | CRUD + 编辑/复制/备注/润色 + 状态推进 |
| 品类地图 | 品牌 × 品类矩阵 · 红格 = 缺口 = 品牌迁移机会 |
| 未起量 | 0 销量 SKU 列表 + 同品类销量/价格分位对照 |
| 查询中心 | 4 Tab：按品类 / 品牌 / 模块 / 未起量 |
| 一键润色 | DeepSeek 改写输入 + 一键还原 |

## 技术栈

- **前端**：Svelte 5 · TypeScript · Vite · svelte-routing · Lucide · axios
- **后端**：Fastify 4 · TypeScript · tsx watch · zod · bcryptjs · @fastify/cookie · dotenv
- **AI**：DeepSeek `deepseek-chat`（OpenAI 兼容，自带关键词字典兜底）
- **数据**：4 张 CSV + papaparse · 概念卡走 JSON 文件存储

## 快速开始

```bash
# 1. 装依赖（pnpm workspace 一次性装好前后端）
pnpm install

# 2. 配置后端环境变量
cp deploy/env.example backend/.env
# 编辑 backend/.env，填 DEEPSEEK_API_KEY（可选；没填走关键词兜底）

# 3. 启动（开两个终端）
pnpm dev:backend   # 监听 :3000
pnpm dev:frontend  # 监听 :5174，自动代理 /api

# 4. 打开浏览器
# http://localhost:5174 → /register → 激活码 TMT6886 → 登录
```

## 仓库地图

```text
.
├── README.md                    本文件
├── CLAUDE.md                    工作目录约定（含 v1 路线提醒）
├── DEV.md                       开发指南
├── ROADMAP.md                   v1.5 路线候选
├── 内测指南.md                  4 人内测使用手册
├── 产品组合器_v1.md             权威路线文档
├── 项目进展_v1.2.html           最新进展 HTML 总结
├── frontend_styleguide.html     设计 token 种子
│
├── frontend/                    Svelte 5 + Vite
│   └── src/
│       ├── App.svelte           路由 + 鉴权守卫
│       ├── lib/                 Icon, api, types, auth.svelte
│       └── routes/              8 个页面 .svelte
│
├── backend/                     Fastify + tsx
│   └── src/
│       ├── server.ts            入口 + 鉴权钩子 + CORS
│       ├── config.ts            读 .env
│       ├── routes/              auth / cards / compose / insights /
│       │                        modules / overview / polish / products
│       └── services/            cardsStore / composer / dataLoader /
│                                insights / llmParser / polisher /
│                                userModulesStore / usersStore
│
├── data/                        数据底座（CSV + JSON）
│   ├── product_assets.csv       4620 SKU
│   ├── modules.csv              354 模块
│   ├── module_product_link.csv  534 复用关系
│   ├── competitor_intel.csv     31 条竞品情报
│   ├── user_added_modules.csv   用户补录模块（运行时生成）
│   ├── cards/*.json             概念卡（运行时生成，团队共享）
│   └── users.json               用户哈希（gitignored！）
│
├── scripts/                     ETL 脚本（Python）
│   ├── parse_sales.py           销量表 → product_assets.csv
│   ├── parse_modules.py         工厂模块库 → modules.csv
│   ├── parse_competitor_intel.py 货盘 → competitor_intel.csv
│   ├── verify_joins.py          JOIN 命中率审计
│   └── build_query_center.py    查询中心数据预聚合
│
├── deploy/                      内网部署
│   ├── DEPLOY.md
│   ├── env.example              env 模板
│   ├── nginx.conf               nginx 反代配置
│   └── standalone-web.mjs       生产 static 服务
│
├── Dockerfile + docker-compose.yml   一键容器部署
│
└── RawData/                     原始 Excel（gitignored）
    ├── 货盘/                    含 sediment_pallet.py ETL
    ├── Module File Lib/         工厂模块库
    └── Product Monthly Sales File/  销量主表
```

## AI 边界

| 做 | 不做 |
|---|---|
| 解析自然语言为 5 维度 | 评分 / 打分 |
| 匹配 6 类模块（版型/面料/结构/外观/功能/包装） | 审批 / 决策 |
| 同品类资产对照 | 任务分发 |
| 生成概念卡草案 + 润色文本 | 判生死、定优先级 |

**4 象限（明星/潜力/红海/鸡肋）由用户基于事实数据自选**，系统不打标。

## 重要原则

1. **先录资产，再谈 AI** — 没有 `product_assets.csv` 和 `modules.csv` 时 AI 不能凭空判断
2. **判断可追溯** — 任何"爆品升级 / 品类缺失 / 未起量"结论都必须引用 SKU/模块/销量/竞品作为证据
3. **AI 不判生死** — AI 负责解析、匹配、解释、生成草案，不做评分、不做审批
4. **新内容带作者标签回流** — 用户补录的模块带 `author` + `收集时间` + `确认状态`
5. **LLM 失败必须兜底** — DeepSeek 任何错误自动回退到关键词字典，不抛错给前端

## 已剪枝（不要恢复）

`7e79232 refactor: 剪枝立项专家方向` 之后以下方向**不再回归**：

- 飞书 01-06 多维表（产品立项池 / 模块预检 / 评分卡 / 路径输出 / 任务分发 / 立项复盘）
- 立项专家 Agent SOP / runbook
- AI 评分卡和打分锚点
- openclaw 建表脚本

## 协议

内部工具，未授权前不要公开使用或转发数据。
