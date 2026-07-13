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
  cookieSecret: process.env.COOKIE_SECRET || '',
  activationCode: process.env.ACTIVATION_CODE || '',
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

// 启动时校验关键安全配置，未设置则直接退出，防止使用空/默认密钥运行
if (!config.cookieSecret || config.cookieSecret.length < 16) {
  throw new Error(
    '环境变量 COOKIE_SECRET 必须设置且长度至少 16 位。' +
    '建议生成强密钥: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

if (!config.activationCode) {
  throw new Error('环境变量 ACTIVATION_CODE 必须设置');
}
