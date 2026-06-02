/**
 * 总览路由 - 驾驶舱首页用
 */
import type { FastifyPluginAsync } from 'fastify';
import { getStore } from '../services/dataLoader.js';
import { countCardsThisMonth } from '../services/cardsStore.js';

export const overviewRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/overview', async () => {
    const { overview, loadedAt } = getStore();
    const newCardsThisMonth = await countCardsThisMonth();
    return {
      ...overview,
      newCardsThisMonth,
      loadedAt: loadedAt.toISOString(),
    };
  });

  app.get('/api/health', async () => ({
    ok: true,
    ts: new Date().toISOString(),
  }));
};
