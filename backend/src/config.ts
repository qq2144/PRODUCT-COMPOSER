/**
 * 后端配置
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '127.0.0.1',
  // 数据目录（相对仓库根的 data/）
  dataDir: path.resolve(__dirname, '../../data'),
  // CORS 允许的前端 origin
  corsOrigin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173', 'http://127.0.0.1:5173'],
  logLevel: process.env.LOG_LEVEL ?? 'info',
  // 鉴权
  // 内测期固定值，正式部署前用 env 注入
  cookieSecret: process.env.COOKIE_SECRET ?? 'tmt-v1-cookie-secret-change-me-in-prod',
  activationCode: process.env.ACTIVATION_CODE ?? 'TMT6886',
  // cookie 名（前端不需要读，httpOnly）
  sessionCookie: 'tmt_session',
  // LLM（DeepSeek，OpenAI 兼容）
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    // 超时 ms — 内测可接受 ~15s；超过自动降级到关键词字典
    timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS) || 15000,
  },
} as const;
