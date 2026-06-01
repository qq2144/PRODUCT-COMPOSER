/**
 * 总览路由 - 驾驶舱首页用
 */
import type { FastifyPluginAsync } from 'fastify';
import { getStore } from '../services/dataLoader.js';

export const overviewRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/overview', async () => {
    const { overview, loadedAt } = getStore();
    return {
      ...overview,
      loadedAt: loadedAt.toISOString(),
    };
  });

  app.get('/api/health', async () => ({
    ok: true,
    ts: new Date().toISOString(),
  }));
};
