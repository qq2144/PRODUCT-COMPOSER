/**
 * Fastify 入口
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { loadData } from './services/dataLoader.js';
import { overviewRoute } from './routes/overview.js';
import { productsRoute } from './routes/products.js';
import { modulesRoute } from './routes/modules.js';

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  },
});

async function bootstrap() {
  // CORS
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // 加载数据
  app.log.info('正在加载 4 张 CSV 数据...');
  const t0 = Date.now();
  const store = await loadData();
  app.log.info(
    `数据加载完成 (${Date.now() - t0}ms): SKU=${store.products.length} 模块=${store.modules.length} 链接=${store.links.length} 竞品=${store.competitors.length}`
  );

  // 路由
  await app.register(overviewRoute);
  await app.register(productsRoute);
  await app.register(modulesRoute);

  // 启动
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`🚀 后端已启动: http://${config.host}:${config.port}`);
  app.log.info(`   GET /api/health    健康检查`);
  app.log.info(`   GET /api/overview  总览数据（驾驶舱）`);
  app.log.info(`   GET /api/products  SKU 查询（支持 brand/category/q/...）`);
  app.log.info(`   GET /api/modules   模块查询`);
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
