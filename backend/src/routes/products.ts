/**
 * 产品（SKU）查询路由
 *   GET  /api/products?brand=&category=&salesMin=&priceMin=&priceMax=&q=&limit=&offset=
 *   GET  /api/products/:productAbbrev   - 按货品简称查单个产品的全部规格
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getStore } from '../services/dataLoader.js';

const querySchema = z.object({
  brand: z.string().optional(),
  category: z.string().optional(),
  salesMin: z.coerce.number().int().min(0).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  zeroOnly: z.coerce.boolean().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const productsRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/products', async (req) => {
    const parsed = querySchema.parse(req.query);
    const { products } = getStore();

    const search = parsed.q?.toLowerCase();
    let filtered = products.filter((p) => {
      if (parsed.brand && p.brand !== parsed.brand) return false;
      if (parsed.category && p.category !== parsed.category) return false;
      if (parsed.salesMin !== undefined && p.sales < parsed.salesMin) return false;
      if (parsed.priceMin !== undefined && p.price < parsed.priceMin) return false;
      if (parsed.priceMax !== undefined && p.price > parsed.priceMax) return false;
      if (parsed.zeroOnly && !p.is_zero_sales) return false;
      if (search) {
        const hay = (p.product_abbrev + p.name + p.spec + p.code).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    // 按销量降序
    filtered.sort((a, b) => b.sales - a.sales);

    const total = filtered.length;
    const page = filtered.slice(parsed.offset, parsed.offset + parsed.limit);

    return {
      total,
      limit: parsed.limit,
      offset: parsed.offset,
      items: page,
    };
  });

  app.get<{ Params: { productAbbrev: string } }>('/api/products/:productAbbrev', async (req, reply) => {
    const { products } = getStore();
    const abbrev = req.params.productAbbrev;
    const matched = products.filter(
      (p) => p.product_abbrev === abbrev || p.name.includes(abbrev)
    );
    if (matched.length === 0) {
      reply.code(404);
      return { error: 'product not found' };
    }
    return {
      productAbbrev: abbrev,
      totalSpecs: matched.length,
      totalSales: matched.reduce((sum, p) => sum + p.sales, 0),
      brands: Array.from(new Set(matched.map((p) => p.brand))),
      items: matched,
    };
  });
};
