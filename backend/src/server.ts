/**
 * Fastify 入口
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { loadData } from './services/dataLoader.js';
import { overviewRoute } from './routes/overview.js';
import { productsRoute } from './routes/products.js';
import { modulesRoute } from './routes/modules.js';
import { composeRoute } from './routes/compose.js';
import { insightsRoute } from './routes/insights.js';
import { cardsRoute } from './routes/cards.js';
import { authRoute } from './routes/auth.js';
import { polishRoute } from './routes/polish.js';

// 给所有 request 加 currentUser 字段（不导出类型，避免外部 import 复杂度）
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: string;
  }
}

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  },
});

// 鉴权豁免清单（前缀匹配）
const PUBLIC_PREFIXES = ['/api/health', '/api/auth/'];

async function bootstrap() {
  // CORS（需带 credentials 才能跨域发 cookie）
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Cookie 签名（鉴权用）
  await app.register(cookie, {
    secret: config.cookieSecret,
  });

  // 全局鉴权钩子：解析 session cookie → 写到 req.currentUser
  // 命中豁免清单的不强制；其他路由没有 currentUser 则 401
  app.addHook('preHandler', async (req, reply) => {
    const raw = req.cookies[config.sessionCookie];
    if (raw) {
      const unsigned = req.unsignCookie(raw);
      if (unsigned.valid && unsigned.value) {
        req.currentUser = unsigned.value;
      }
    }
    // 健康检查 + 鉴权接口豁免
    const url = req.url.split('?')[0] ?? '';
    if (PUBLIC_PREFIXES.some((p) => url.startsWith(p))) return;
    // 其他接口要求登录
    if (!req.currentUser) {
      reply.code(401);
      return reply.send({ error: 'not logged in' });
    }
  });

  // 加载数据
  app.log.info('正在加载 4 张 CSV 数据...');
  const t0 = Date.now();
  const store = await loadData();
  app.log.info(
    `数据加载完成 (${Date.now() - t0}ms): SKU=${store.products.length} 模块=${store.modules.length} 链接=${store.links.length} 竞品=${store.competitors.length}`
  );

  // 路由（/api/health 在 overviewRoute 里声明）
  await app.register(authRoute);
  await app.register(overviewRoute);
  await app.register(productsRoute);
  await app.register(modulesRoute);
  await app.register(composeRoute);
  await app.register(insightsRoute);
  await app.register(cardsRoute);
  await app.register(polishRoute);

  // LLM 状态打印
  if (config.deepseek.apiKey) {
    app.log.info(`🤖 LLM 解析已启用：${config.deepseek.model} @ ${config.deepseek.baseUrl}`);
  } else {
    app.log.info('🔤 LLM 未配置（无 DEEPSEEK_API_KEY），使用关键词字典解析');
  }

  // 启动
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`🚀 后端已启动: http://${config.host}:${config.port}`);
  app.log.info(`   GET  /api/health        健康检查（公开）`);
  app.log.info(`   POST /api/auth/register 注册（需激活码）`);
  app.log.info(`   POST /api/auth/login    登录`);
  app.log.info(`   GET  /api/auth/me       当前用户`);
  app.log.info(`   GET  /api/overview      总览数据`);
  app.log.info(`   GET  /api/products      SKU 查询`);
  app.log.info(`   *    /api/modules       模块 CRUD ⭐ M6`);
  app.log.info(`   POST /api/compose       组合器`);
  app.log.info(`   GET  /api/category-map  品类地图 ⭐ M4`);
  app.log.info(`   GET  /api/underperform  未起量诊断 ⭐ M4`);
  app.log.info(`   *    /api/cards         概念卡持久化 ⭐ M5`);
  app.log.info(`   POST /api/polish        一键润色（LLM）`);
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
