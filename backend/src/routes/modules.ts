/**
 * 模块查询路由
 *   GET /api/modules                       - 列表+筛选
 *   GET /api/modules/:moduleId             - 单模块详情 + 关联 SKU + 销量
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getStore } from '../services/dataLoader.js';

const queryListSchema = z.object({
  type: z.string().optional(),
  factory: z.string().optional(),
  hasReuse: z.coerce.boolean().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const modulesRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/modules', async (req) => {
    const parsed = queryListSchema.parse(req.query);
    const { modules, links } = getStore();
    const search = parsed.q?.toLowerCase();

    // 预算每模块复用次数
    const reuseCount = new Map<string, number>();
    for (const l of links) {
      reuseCount.set(l.module_id, (reuseCount.get(l.module_id) ?? 0) + 1);
    }

    let filtered = modules.filter((m) => {
      if (parsed.type && m.module_type_sheet !== parsed.type) return false;
      if (parsed.factory && m.factory_src !== parsed.factory) return false;
      if (parsed.hasReuse && (reuseCount.get(m.module_id) ?? 0) === 0) return false;
      if (search) {
        const hay = (m.module_id + m.module_name + m.material).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    // 按复用次数降序
    filtered.sort((a, b) => (reuseCount.get(b.module_id) ?? 0) - (reuseCount.get(a.module_id) ?? 0));

    const total = filtered.length;
    const page = filtered.slice(parsed.offset, parsed.offset + parsed.limit).map((m) => ({
      ...m,
      reuse_count: reuseCount.get(m.module_id) ?? 0,
    }));

    return { total, limit: parsed.limit, offset: parsed.offset, items: page };
  });

  app.get<{ Params: { moduleId: string } }>('/api/modules/:moduleId', async (req, reply) => {
    const { modules, links, products } = getStore();
    const moduleId = req.params.moduleId;

    const mod = modules.find((m) => m.module_id === moduleId);
    if (!mod) {
      reply.code(404);
      return { error: 'module not found' };
    }

    // 找复用记录
    const moduleLinks = links.filter((l) => l.module_id === moduleId);

    // 把 link 关联到真 SKU（精确匹配 product_abbrev + 名称包含模糊匹配）
    // 注意：销量表同一 SKU 在不同店铺有多行，去重 key 必须用 (商家编码, 店铺, 规格) 三元组
    const productSet = new Map<string, typeof products[number] & { reusePosition: string }>();
    for (const l of moduleLinks) {
      const code = l.product_code.trim();
      if (!code) continue;
      for (const p of products) {
        const exact = p.product_abbrev === code;
        const nameMatch = !exact && p.name.includes(code);
        if (exact || nameMatch) {
          const key = `${p.code}|${p.shop}|${p.spec}`;
          if (!productSet.has(key)) {
            productSet.set(key, { ...p, reusePosition: l.reuse_position });
          }
        }
      }
    }

    const relatedProducts = Array.from(productSet.values());
    // 按销量降序，方便前端展示
    relatedProducts.sort((a, b) => b.sales - a.sales);
    const totalSales = relatedProducts.reduce((s, p) => s + p.sales, 0);
    const brands = Array.from(new Set(relatedProducts.map((p) => p.brand).filter(Boolean)));

    return {
      module: mod,
      reuseCount: moduleLinks.length,
      relatedProductsCount: relatedProducts.length,
      totalSales,
      brands,
      links: moduleLinks,
      relatedProducts,
    };
  });
};
