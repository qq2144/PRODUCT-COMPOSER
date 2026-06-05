/**
 * 用户存储 - JSON 文件
 *
 * 存储位置：data/users.json
 * 结构：{ users: [{ username, passwordHash, createdAt }] }
 *
 * 设计：
 *   - bcrypt 哈希（成本 10，4 人内部够用）
 *   - 该文件**不入 git**（含密码哈希），在 .gitignore 配
 *   - 注册需激活码，校验逻辑在 routes/auth.ts 里
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

const USERS_FILE = path.join(config.dataDir, 'users.json');

export interface User {
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface UsersFile {
  users: User[];
}

async function readFile(): Promise<UsersFile> {
  try {
    const buf = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(buf) as UsersFile;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { users: [] };
    throw e;
  }
}

async function writeFile(data: UsersFile): Promise<void> {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getUser(username: string): Promise<User | null> {
  const data = await readFile();
  return data.users.find((u) => u.username === username) ?? null;
}

export async function listUsernames(): Promise<string[]> {
  const data = await readFile();
  return data.users.map((u) => u.username);
}

export async function createUser(username: string, password: string): Promise<User> {
  const data = await readFile();
  if (data.users.some((u) => u.username === username)) {
    throw new Error('USERNAME_TAKEN');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  await writeFile(data);
  return user;
}

export async function verifyPassword(username: string, password: string): Promise<boolean> {
  const user = await getUser(username);
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}
