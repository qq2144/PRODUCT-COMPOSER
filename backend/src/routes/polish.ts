/**
 * POST /api/polish — 一键润色输入文本
 * 配置 DEEPSEEK_API_KEY 才可用，否则 503。
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { polishWithLLM } from '../services/polisher.js';

const bodySchema = z.object({
  text: z.string().min(1).max(500),
});

export const polishRoute: FastifyPluginAsync = async (app) => {
  app.post('/api/polish', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid input', details: parsed.error.issues };
    }
    const polished = await polishWithLLM(parsed.data.text);
    if (polished === null) {
      reply.code(503);
      return { error: '润色不可用（未配置 LLM 或调用失败）' };
    }
    return { polished };
  });
};
