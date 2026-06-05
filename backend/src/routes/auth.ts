/**
 * 鉴权路由
 *   POST /api/auth/register   { username, password, activationCode } → 创建账号 + 登录
 *   POST /api/auth/login      { username, password } → 设置 session cookie
 *   POST /api/auth/logout                              → 清 cookie
 *   GET  /api/auth/me                                  → 返回当前登录用户名
 *
 * Cookie 设计：
 *   - httpOnly 签名 cookie，名 = config.sessionCookie
 *   - 值 = username（明文，签名保证不可篡改）
 *   - sameSite=lax，path=/
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createUser, getUser, verifyPassword } from '../services/usersStore.js';
import { config } from '../config.js';

const registerSchema = z.object({
  username: z
    .string()
    .min(2, '用户名至少 2 字')
    .max(40, '用户名最多 40 字')
    .regex(/^[\w一-龥.-]+$/, '用户名只能用字母/数字/中文/._-'),
  password: z.string().min(6, '密码至少 6 位').max(100),
  activationCode: z.string().min(1),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const COOKIE_OPTS = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax' as const,
  path: '/',
  // 内测在 http 跑，先不开 secure；上 https 时改 true
  secure: false,
  // 30 天
  maxAge: 30 * 24 * 60 * 60,
};

export const authRoute: FastifyPluginAsync = async (app) => {
  app.post('/api/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid input', details: parsed.error.issues };
    }
    const { username, password, activationCode } = parsed.data;
    if (activationCode !== config.activationCode) {
      reply.code(403);
      return { error: '激活码错误' };
    }
    try {
      await createUser(username, password);
    } catch (e) {
      if ((e as Error).message === 'USERNAME_TAKEN') {
        reply.code(409);
        return { error: '用户名已被占用' };
      }
      throw e;
    }
    reply.setCookie(config.sessionCookie, username, COOKIE_OPTS);
    return { ok: true, username };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid input' };
    }
    const { username, password } = parsed.data;
    const ok = await verifyPassword(username, password);
    if (!ok) {
      reply.code(401);
      return { error: '用户名或密码错误' };
    }
    reply.setCookie(config.sessionCookie, username, COOKIE_OPTS);
    return { ok: true, username };
  });

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.clearCookie(config.sessionCookie, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (req, reply) => {
    const username = (req as { currentUser?: string }).currentUser;
    if (!username) {
      reply.code(401);
      return { error: 'not logged in' };
    }
    // 防止 users.json 被删后 cookie 还残留
    const user = await getUser(username);
    if (!user) {
      reply.clearCookie(config.sessionCookie, { path: '/' });
      reply.code(401);
      return { error: 'user no longer exists' };
    }
    return { username };
  });
};
