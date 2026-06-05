/**
 * 用户补录的模块 - data/user_added_modules.csv
 *
 * 列：module_id, module_type_sheet, module_name, factory_src, material,
 *     color, price, size, design_time, remark, image_front_id, image_back_id,
 *     author, confirm_status
 *
 * 启动时与 modules.csv 合并到内存 store；运行时新增立刻 push 到 store.modules，
 * 不需要重启即可参与 compose 匹配。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';
import { config } from '../config.js';
import type { Module } from '../types.js';

const USER_MODULES_FILE = path.join(config.dataDir, 'user_added_modules.csv');

const HEADER = [
  'module_id',
  'module_type_sheet',
  'module_name',
  'factory_src',
  'material',
  'color',
  'price',
  'size',
  'design_time',
  'remark',
  'image_front_id',
  'image_back_id',
  'author',
  'confirm_status',
] as const;

function newModuleId(now: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const stamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const rand = Math.random().toString(36).slice(2, 6);
  return `USR-${stamp}-${rand}`;
}

/** 启动时读：文件不存在返回空 */
export async function loadUserModules(): Promise<Module[]> {
  try {
    const content = await fs.readFile(USER_MODULES_FILE, 'utf-8');
    const clean = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
    const parsed = Papa.parse<Record<string, string>>(clean, {
      header: true,
      skipEmptyLines: true,
    });
    return parsed.data.map((r) => ({
      module_id: r.module_id ?? '',
      module_type_sheet: r.module_type_sheet ?? '',
      module_name: r.module_name ?? '',
      factory_src: r.factory_src ?? '',
      material: r.material ?? '',
      color: r.color ?? '',
      price: r.price ?? '',
      size: r.size ?? '',
      design_time: r.design_time ?? '',
      remark: r.remark ?? '',
      image_front_id: r.image_front_id ?? '',
      image_back_id: r.image_back_id ?? '',
      author: r.author ?? '',
      confirm_status: r.confirm_status ?? '',
    }));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

export interface AddUserModuleInput {
  dimension: string;     // module_type_sheet
  name: string;
  description: string;   // 落到 remark
  material?: string;
  author: string;
}

/** 追加一行；如果文件不存在先写 header（含 BOM） */
export async function appendUserModule(input: AddUserModuleInput): Promise<Module> {
  await fs.mkdir(path.dirname(USER_MODULES_FILE), { recursive: true });
  const now = new Date();
  const mod: Module = {
    module_id: newModuleId(now),
    module_type_sheet: input.dimension,
    module_name: input.name,
    factory_src: '',
    material: input.material ?? '',
    color: '',
    price: '',
    size: '',
    design_time: now.toISOString().slice(0, 10),
    remark: input.description,
    image_front_id: '',
    image_back_id: '',
    author: input.author,
    confirm_status: '待审',
  };

  // 文件不存在：先写带 BOM 的 header
  let exists = true;
  try {
    await fs.access(USER_MODULES_FILE);
  } catch {
    exists = false;
  }

  const rowCsv = Papa.unparse([mod as unknown as Record<string, unknown>], {
    columns: HEADER as unknown as string[],
    header: false,
  });

  if (!exists) {
    const headerCsv = HEADER.join(',');
    await fs.writeFile(USER_MODULES_FILE, '﻿' + headerCsv + '\n' + rowCsv + '\n', 'utf-8');
  } else {
    await fs.appendFile(USER_MODULES_FILE, rowCsv + '\n', 'utf-8');
  }
  return mod;
}
