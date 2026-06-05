/**
 * 概念卡持久化 - 文件存储
 *
 * 存储位置：data/cards/{id}.json
 * id 格式：card-{YYYYMMDDhhmmss}-{6位随机}
 *
 * 设计原则：
 *   - 一卡一文件，方便人工 cat 看
 *   - 入 git（小、纯文本、跨人协作）
 *   - 删除即从磁盘移除，不留 tombstone（v1 简单优先）
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import type {
  ConceptCardSaved,
  ConceptCardStatus,
  ConceptCardSummary,
} from '../types.js';

const CARDS_DIR = path.join(config.dataDir, 'cards');

async function ensureCardsDir(): Promise<void> {
  await fs.mkdir(CARDS_DIR, { recursive: true });
}

function newId(now: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const stamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const rand = Math.random().toString(36).slice(2, 8);
  return `card-${stamp}-${rand}`;
}

function safeIdToPath(id: string): string {
  // 阻断路径穿越
  if (!/^card-\d{14}-[a-z0-9]{4,8}$/.test(id)) {
    throw new Error(`非法的概念卡 id: ${id}`);
  }
  return path.join(CARDS_DIR, `${id}.json`);
}

function toSummary(card: ConceptCardSaved): ConceptCardSummary {
  // 兼容老卡（category/brand 单值）和新卡（categories/brands 数组）
  const parsed = card.payload.parsedIntent as
    | {
        category?: string;
        categories?: string[];
        brand?: string;
        brands?: string[];
      }
    | undefined;
  const cat = parsed?.categories?.[0] ?? parsed?.category ?? '';
  const brd = parsed?.brands?.[0] ?? parsed?.brand ?? '';
  return {
    id: card.id,
    name: card.name,
    summary: card.summary,
    rawText: card.rawText,
    userQuadrant: card.userQuadrant,
    author: card.author,
    status: card.status,
    note: card.note ?? '',          // 老卡缺 note 兜空
    totalMatchedModules: card.payload.totalMatchedModules,
    parsedCategory: cat,
    parsedBrand: brd,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export interface CreateCardInput {
  name: string;
  summary: string;
  rawText: string;
  userQuadrant: string;
  author?: string;
  /** 可选；不传默认空。复制卡片时用来携带备注 */
  note?: string;
  payload: ConceptCardSaved['payload'];
}

export async function createCard(input: CreateCardInput): Promise<ConceptCardSaved> {
  await ensureCardsDir();
  const now = new Date();
  const card: ConceptCardSaved = {
    id: newId(now),
    name: input.name,
    summary: input.summary,
    rawText: input.rawText,
    userQuadrant: input.userQuadrant ?? '',
    author: input.author ?? '内部用户',
    status: 'draft',
    note: input.note ?? '',
    payload: input.payload,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await fs.writeFile(safeIdToPath(card.id), JSON.stringify(card, null, 2), 'utf-8');
  return card;
}

export async function getCard(id: string): Promise<ConceptCardSaved | null> {
  try {
    const buf = await fs.readFile(safeIdToPath(id), 'utf-8');
    return JSON.parse(buf) as ConceptCardSaved;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

export interface ListCardsQuery {
  author?: string;
  brand?: string;
  category?: string;
  quadrant?: string;
  status?: ConceptCardStatus;
  q?: string;
}

export async function listCards(query: ListCardsQuery = {}): Promise<{
  total: number;
  items: ConceptCardSummary[];
}> {
  await ensureCardsDir();
  const files = await fs.readdir(CARDS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const all: ConceptCardSummary[] = [];
  for (const f of jsonFiles) {
    try {
      const buf = await fs.readFile(path.join(CARDS_DIR, f), 'utf-8');
      const card = JSON.parse(buf) as ConceptCardSaved;
      all.push(toSummary(card));
    } catch (e) {
      console.warn(`[cardsStore] 跳过损坏的卡片文件 ${f}:`, e);
    }
  }

  let items = all;
  if (query.author) items = items.filter((c) => c.author === query.author);
  if (query.brand) items = items.filter((c) => c.parsedBrand === query.brand);
  if (query.category) items = items.filter((c) => c.parsedCategory === query.category);
  if (query.quadrant) items = items.filter((c) => c.userQuadrant === query.quadrant);
  if (query.status) items = items.filter((c) => c.status === query.status);
  if (query.q) {
    const q = query.q.toLowerCase();
    items = items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.rawText.toLowerCase().includes(q),
    );
  }

  // 倒序（新→旧）
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return { total: items.length, items };
}

export interface UpdateCardInput {
  name?: string;
  summary?: string;
  userQuadrant?: string;
  status?: ConceptCardStatus;
  note?: string;
  /** 改解析维度（前端编辑 5 维度 chip 后保存）— 整体覆盖 payload.parsedIntent */
  parsedIntent?: unknown;
}

export async function updateCard(
  id: string,
  patch: UpdateCardInput,
): Promise<ConceptCardSaved | null> {
  const card = await getCard(id);
  if (!card) return null;
  const updated: ConceptCardSaved = {
    ...card,
    note: card.note ?? '',
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
    ...(patch.userQuadrant !== undefined ? { userQuadrant: patch.userQuadrant } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.note !== undefined ? { note: patch.note } : {}),
    payload: patch.parsedIntent !== undefined
      ? { ...card.payload, parsedIntent: patch.parsedIntent }
      : card.payload,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(safeIdToPath(id), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function deleteCard(id: string): Promise<boolean> {
  try {
    await fs.unlink(safeIdToPath(id));
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}

/** 驾驶舱用：本月新增概念卡数量 */
export async function countCardsThisMonth(): Promise<number> {
  await ensureCardsDir();
  const files = await fs.readdir(CARDS_DIR);
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let n = 0;
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const buf = await fs.readFile(path.join(CARDS_DIR, f), 'utf-8');
      const card = JSON.parse(buf) as ConceptCardSaved;
      if (card.createdAt.startsWith(prefix)) n++;
    } catch {
      // ignore
    }
  }
  return n;
}
