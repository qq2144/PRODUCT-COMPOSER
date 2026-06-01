/**
 * 组合器路由
 *   POST /api/compose         接收自然语言文本，返回组合结果
 *   GET  /api/compose/keywords 返回字典（前端用来做"补充输入"提示）
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { compose } from '../services/composer.js';

const composeSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const composeRoute: FastifyPluginAsync = async (app) => {
  app.post('/api/compose', async (req, reply) => {
    const parsed = composeSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid input', details: parsed.error.issues };
    }
    const result = await compose(parsed.data.text);
    return result;
  });
};
