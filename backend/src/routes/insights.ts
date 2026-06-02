/**
 * 洞察类路由（M4）
 *   GET  /api/category-map                            品牌×品类矩阵
 *   GET  /api/underperform                            未起量 SKU 列表
 *   GET  /api/underperform/:productAbbrev             单 SKU 诊断
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCategoryMap, listUnderperformSkus, diagnoseSku } from '../services/insights.js';

const categoryMapSchema = z.object({
  minCategorySize: z.coerce.number().int().min(0).optional(),
});

const underperformSchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  salesMax: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const insightsRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/category-map', async (req) => {
    const parsed = categoryMapSchema.parse(req.query);
    return getCategoryMap({ minCategorySize: parsed.minCategorySize });
  });

  app.get('/api/underperform', async (req) => {
    const parsed = underperformSchema.parse(req.query);
    return listUnderperformSkus(parsed);
  });

  app.get<{ Params: { productAbbrev: string } }>('/api/underperform/:productAbbrev', async (req, reply) => {
    const r = diagnoseSku(req.params.productAbbrev);
    if (!r) {
      reply.code(404);
      return { error: 'sku not found' };
    }
    return r;
  });
};
