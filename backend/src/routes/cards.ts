/**
 * 概念卡 CRUD - M5
 *   POST   /api/cards          保存（来自 /compose 的完整 payload + 用户自选象限/作者）
 *   GET    /api/cards          列表（支持 author/brand/category/quadrant/status/q 过滤）
 *   GET    /api/cards/:id      单卡详情
 *   PATCH  /api/cards/:id      改名/改象限/改状态
 *   DELETE /api/cards/:id      删除
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createCard,
  getCard,
  listCards,
  updateCard,
  deleteCard,
  type CreateCardInput,
} from '../services/cardsStore.js';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  summary: z.string().max(2000).default(''),
  rawText: z.string().min(1).max(2000),
  userQuadrant: z.string().max(20).default(''),
  author: z.string().max(60).optional(),
  payload: z.object({
    parsedIntent: z.unknown(),
    matchedModules: z.unknown(),
    totalMatchedModules: z.number().int().nonnegative(),
    assetComparison: z.unknown(),
    conceptCardDraft: z.unknown(),
  }),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  userQuadrant: z.string().max(20).optional(),
  status: z.enum(['draft', 'discussion', 'sample', 'archived']).optional(),
});

const listQuerySchema = z.object({
  author: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  quadrant: z.string().optional(),
  status: z.enum(['draft', 'discussion', 'sample', 'archived']).optional(),
  q: z.string().optional(),
});

export const cardsRoute: FastifyPluginAsync = async (app) => {
  app.post('/api/cards', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid input', details: parsed.error.issues };
    }
    // zod 的 z.unknown() 推断为 optional，这里转回到 CreateCardInput；
    // 运行时已通过 safeParse 校验过形状，cast 安全。
    const card = await createCard(parsed.data as CreateCardInput);
    return card;
  });

  app.get('/api/cards', async (req) => {
    const q = listQuerySchema.parse(req.query ?? {});
    return await listCards(q);
  });

  app.get('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const card = await getCard(id);
    if (!card) {
      reply.code(404);
      return { error: 'not found' };
    }
    return card;
  });

  app.patch('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid input', details: parsed.error.issues };
    }
    const updated = await updateCard(id, parsed.data);
    if (!updated) {
      reply.code(404);
      return { error: 'not found' };
    }
    return updated;
  });

  app.delete('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await deleteCard(id);
    if (!ok) {
      reply.code(404);
      return { error: 'not found' };
    }
    return { ok: true };
  });
};
