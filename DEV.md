# 开发指南

## 启动

需要 Node.js 18+ 和 pnpm。

```bash
# 第一次：装依赖
pnpm install

# 同时启动后端 + 前端（开两个 PowerShell 窗口）
pnpm dev:backend     # 后端 http://127.0.0.1:3000
pnpm dev:frontend    # 前端 http://127.0.0.1:5173 (Vite 代理 /api → 后端)

# 或者一条命令并行启动（用 pnpm -r --parallel）
pnpm dev
```

## 项目结构

```
5-20/
├── backend/                Fastify + TypeScript
│   ├── src/
│   │   ├── server.ts       入口
│   │   ├── config.ts
│   │   ├── types.ts        4 张 CSV 行 schema
│   │   ├── services/
│   │   │   └── dataLoader.ts   启动时把 CSV 读入内存
│   │   └── routes/
│   │       ├── overview.ts     GET /api/overview · health
│   │       ├── products.ts     GET /api/products · /api/products/:abbrev
│   │       └── modules.ts      GET /api/modules · /api/modules/:moduleId
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/               Svelte 5 + Vite + TypeScript
│   ├── src/
│   │   ├── main.ts         入口
│   │   ├── App.svelte      根组件（顶部导航 + Router）
│   │   ├── app.css         全局 token + 通用组件
│   │   ├── lib/
│   │   │   ├── types.ts    前端类型（与后端 mirror）
│   │   │   └── api.ts      axios 客户端
│   │   └── routes/
│   │       ├── Cockpit.svelte    🏠 驾驶舱（总览）
│   │       └── Query.svelte      🔍 查询中心
│   ├── vite.config.ts      含 /api → backend 代理
│   ├── tsconfig.json
│   └── package.json
│
├── data/                   产品资产数据（4 张 CSV）
├── scripts/                数据 ETL 脚本（Python）
├── RawData/                原始数据
│
├── pnpm-workspace.yaml     monorepo 配置
└── package.json            根 package.json
```

## API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/overview` | 驾驶舱总览数据 |
| GET | `/api/products` | SKU 查询（支持 brand/category/q/salesMin/zeroOnly...）|
| GET | `/api/products/:productAbbrev` | 单个产品的全部规格 |
| GET | `/api/modules` | 模块查询 |
| GET | `/api/modules/:moduleId` | 模块详情 + 关联 SKU + 销量加总 |

## 验证 M1

启动后端，浏览器打开 `http://127.0.0.1:3000/api/overview`，应该看到：

```json
{
  "totalSkus": 4620,
  "totalModules": 363,
  "totalCategories": 77,
  "totalBrands": 9,
  "totalLinks": 534,
  "zeroSalesSkus": 233,
  ...
}
```

启动前端，浏览器打开 `http://127.0.0.1:5173`：
- 🏠 驾驶舱：看到 6 个总览数字 + 品类/品牌 TOP
- 🔍 查询中心：4620 SKU 表格 + 多维筛选

## 验证最金贵模块（数据底座打通的标志）

```bash
curl http://127.0.0.1:3000/api/modules/02.06.03
```

应该返回：
- `module.module_name`: "冰感小雨点165cm 160克蓝色"
- `relatedProductsCount`: **19** （SKU 销售行）
- `totalSales`: **31329**
- `brands`: ["SERUNA"]

这是「冰感小雨点」面料模块用在 SERUNA HY63 睡眠护腰上，跨 5 个店铺总销 31329 的真实数据。
