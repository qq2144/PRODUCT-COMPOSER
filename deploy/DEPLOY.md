# 产品组合器上线方法论

目标服务器沿用 BrandVid-AI 服务器。

- 服务器：`47.121.181.240`
- 建议线上端口：`8002`（BrandVid 已占用 `8001`）
- 服务地址：`http://47.121.181.240:8002`
- 服务器项目目录：`/opt/product-composer`
- 前端容器名：`product-composer`
- 后端容器名：`product-composer-backend`
- 前端镜像：`product-composer-web:latest`
- 后端镜像：`product-composer-backend:latest`

## 一、部署结构

本项目使用 Docker Compose 部署两个容器：

- `web`：nginx，托管 `frontend/dist`，并反代 `/api` 到后端。
- `backend`：Node.js，运行 Fastify API，读取 `/app/data`。

端口：

- 对外端口：`8002`
- 前端容器内端口：`80`
- 后端容器内端口：`3000`，不直接暴露公网

生产运行数据：

- `data/users.json`：用户密码哈希，必须保留。
- `data/cards/`：概念卡，必须保留。
- `data/user_added_modules.csv`：用户补录模块，必须保留。
- `data/*.csv`：产品资产底表，首次部署需要上传；后续按业务需要更新。

生产配置：

- `/opt/product-composer/.env`
- 不要上传本地 `backend/.env`。
- 可参考 `deploy/env.example` 在服务器新建 `.env`。

## 二、本地上线前检查

```powershell
git -c safe.directory=D:/1.work/5-20 status --short
pnpm lint
pnpm build
```

## 三、打包本地项目

打包时排除本地密钥、依赖、构建产物和动态数据：

```powershell
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$archive = "product-composer-deploy-$ts.tar.gz"
tar --exclude=.git `
    --exclude=.claude `
    --exclude=.codex `
    --exclude=.agents `
    --exclude=node_modules `
    --exclude=backend/node_modules `
    --exclude=frontend/node_modules `
    --exclude=backend/dist `
    --exclude=frontend/dist `
    --exclude=.env `
    --exclude='.env.*' `
    --exclude=backend/.env `
    --exclude='backend/.env.*' `
    --exclude=data/users.json `
    --exclude=data/cards `
    --exclude=data/user_added_modules.csv `
    --exclude='product-composer-deploy-*.tar.gz' `
    --exclude='**/__pycache__' `
    -czf $archive .
```

## 四、上传到服务器

```bash
scp product-composer-deploy-YYYYMMDD-HHMMSS.tar.gz product-composer-server:/tmp/product-composer-deploy.tar.gz
```

没有 SSH alias 时，使用实际用户和 IP：

```bash
scp product-composer-deploy-YYYYMMDD-HHMMSS.tar.gz root@47.121.181.240:/tmp/product-composer-deploy.tar.gz
```

## 五、服务器端准备

首次部署：

```bash
mkdir -p /opt/product-composer
cd /opt/product-composer
cp deploy/env.example .env
vi .env
```

`.env` 至少需要配置：

- `ACTIVATION_CODE`
- `COOKIE_SECRET`
- `DEEPSEEK_API_KEY`（可选，不填则走关键词 fallback）

## 六、服务器端备份

上线前先备份当前代码和关键运行数据：

```bash
cd /opt
ts=$(date +%Y%m%d-%H%M%S)
tar --exclude=product-composer/.git \
    -czf product-composer-backup-$ts.tar.gz product-composer
```

## 七、解压并同步代码

```bash
mkdir -p /tmp/product-composer-new
rm -rf /tmp/product-composer-new/*
tar -xzf /tmp/product-composer-deploy.tar.gz -C /tmp/product-composer-new

rsync -a --delete \
    --exclude=.env \
    --exclude=backend/.env \
    --exclude=data/users.json \
    --exclude=data/cards \
    --exclude=data/user_added_modules.csv \
    --exclude=.git \
    /tmp/product-composer-new/ /opt/product-composer/
```

同步策略含义：

- 新代码覆盖旧代码。
- 删除线上旧版残留文件。
- 保留线上密钥、用户、概念卡和用户补录模块。
- `data/*.csv` 会跟随本地包更新；如果线上数据底表不想被覆盖，额外排除 `data/*.csv`。

## 八、构建并启动

```bash
cd /opt/product-composer
docker compose up -d --build
```

## 九、上线后验证

```bash
docker ps --filter name=product-composer --format "{{.Names}} {{.Status}} {{.Ports}}"
docker logs --tail 100 product-composer-backend
curl http://127.0.0.1:8002/health
curl http://127.0.0.1:8002/api/health
curl -I http://127.0.0.1:8002/login
```

期望：

- `product-composer` 和 `product-composer-backend` 都是 `Up`。
- `product-composer-backend` 显示 healthy。
- `/health` 返回 `{"ok":true,"service":"product-composer-web"}`。
- `/api/health` 返回 `{"ok":true,...}`。
- `/login` 返回 `200`。

## 十、回滚

如果新版本启动失败，优先回滚代码备份：

```bash
cd /opt
tar -xzf product-composer-backup-YYYYMMDD-HHMMSS.tar.gz
cd /opt/product-composer
docker compose up -d --build
```

如果只是镜像需要回滚，先在上线前保留旧镜像：

```bash
ts=$(date +%Y%m%d-%H%M%S)
docker tag product-composer-web:latest product-composer-web:before-$ts
docker tag product-composer-backend:latest product-composer-backend:before-$ts
```

回滚镜像：

```bash
docker tag product-composer-web:before-YYYYMMDD-HHMMSS product-composer-web:latest
docker tag product-composer-backend:before-YYYYMMDD-HHMMSS product-composer-backend:latest
cd /opt/product-composer
docker compose up -d --no-build --force-recreate
```

## 十一、如果服务器构建失败

本项目完整构建依赖：

- Docker 能拉取 `node:20-bookworm-slim`
- Docker 能拉取 `nginx:1.27-alpine`
- 构建过程能访问 npm registry 下载 pnpm 依赖

如果服务器网络不稳定：

1. 优先修复 Docker Hub / npm registry 连通性。
2. 或在本地构建镜像并 `docker save` 上传到服务器。
3. 如果旧镜像健康且没有新增依赖，可以基于旧镜像做代码热更新。

首次上线没有旧镜像，不能热更新，必须完整构建或上传本地构建好的镜像。

## 十二、Standalone 临时上线方案

如果服务器 Docker 镜像源不可用，且不方便重启 Docker daemon，可以使用不影响其他容器的 standalone 方案：

1. 在服务器项目目录内下载 Linux Node 运行时。
2. 本地上传 `backend/dist`、`frontend/dist` 和 `deploy/standalone-web.mjs`。
3. 在服务器 `backend/` 内用项目自带 Node 执行 `npm install --omit=dev`。
4. 启动两个进程：
   - `node backend/dist/server.js`：Fastify API，监听 `127.0.0.1:3000`
   - `node deploy/standalone-web.mjs`：前端静态文件 + `/api` 代理，监听 `0.0.0.0:8002`

当前服务器已采用该方案跑通，原因是 Docker 镜像源返回 `403 Forbidden`，无法拉取 `node` 和 `nginx` 基础镜像。注意：standalone 方案需要后续补 systemd 服务，才能在服务器重启后自动恢复。
