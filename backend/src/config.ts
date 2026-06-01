/**
 * 后端配置
 */
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
} as const;
