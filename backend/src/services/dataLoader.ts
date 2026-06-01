/**
 * 数据加载层 - 读 4 张 CSV 到内存
 * 启动时加载一次，后续查询都走内存
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';
import { config } from '../config.js';
import type {
  ProductAsset,
  Module,
  ModuleProductLink,
  CompetitorIntel,
  Overview,
} from '../types.js';

interface Store {
  products: ProductAsset[];
  modules: Module[];
  links: ModuleProductLink[];
  competitors: CompetitorIntel[];
  overview: Overview;
  loadedAt: Date;
}

let store: Store | null = null;

async function readCsv<T>(filename: string, mapper: (row: Record<string, string>) => T): Promise<T[]> {
  const filepath = path.join(config.dataDir, filename);
  const content = await fs.readFile(filepath, 'utf-8');
  // 去除 UTF-8 BOM
  const clean = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    console.warn(`[dataLoader] ${filename} 解析有 ${parsed.errors.length} 个警告，首条: `, parsed.errors[0]);
  }
  return parsed.data.map(mapper);
}

function toNum(v: string | undefined, fallback = 0): number {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadData(): Promise<Store> {
  if (store) return store;

  const [products, modules, links, competitors] = await Promise.all([
    readCsv<ProductAsset>('product_assets.csv', (r) => ({
      sku_full_id: r.sku_full_id ?? '',
      code: r['商家编码'] ?? '',
      product_code: r['货品编号'] ?? '',
      product_abbrev: r['货品简称'] ?? '',
      name: r['货品名称'] ?? '',
      spec: r['规格名称'] ?? '',
      brand: r['品牌'] ?? '',
      category: r['分类'] ?? '',
      shop: r['店铺'] ?? '',
      sales: toNum(r['实际销售量']),
      price: toNum(r['零售价']),
      cost: toNum(r['货品总成本']),
      margin: toNum(r['毛利率%']),
      is_zero_sales: r.is_zero_sales === '是',
    })),
    readCsv<Module>('modules.csv', (r) => ({
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
    })),
    readCsv<ModuleProductLink>('module_product_link.csv', (r) => ({
      module_id: r.module_id ?? '',
      reuse_idx: r.reuse_idx ?? '',
      product_name: r.product_name ?? '',
      product_code: r.product_code ?? '',
      reuse_position: r.reuse_position ?? '',
      product_image_id: r.product_image_id ?? '',
      factory_src: r.factory_src ?? '',
      module_type_sheet: r.module_type_sheet ?? '',
    })),
    readCsv<CompetitorIntel>('competitor_intel.csv', (r) => ({
      pallet_file: r.pallet_file ?? '',
      month_sheet: r.month_sheet ?? '',
      l1_category: r.l1_category ?? '',
      l2_category: r.l2_category ?? '',
      sub_category: r.sub_category ?? '',
      generation: r.generation ?? '',
      competitor_url: r.competitor_url ?? '',
      competitor_sales_note: r.competitor_sales_note ?? '',
      team_upgrade_idea: r.team_upgrade_idea ?? '',
      source: r.source ?? '',
    })),
  ]);

  // 计算 overview
  const categoryCount = new Map<string, number>();
  const brandCount = new Map<string, number>();
  let zeroSales = 0;
  for (const p of products) {
    if (p.category) categoryCount.set(p.category, (categoryCount.get(p.category) ?? 0) + 1);
    if (p.brand) brandCount.set(p.brand, (brandCount.get(p.brand) ?? 0) + 1);
    if (p.is_zero_sales) zeroSales++;
  }
  const sortByCount = (a: { count: number }, b: { count: number }) => b.count - a.count;
  const categoriesTop = Array.from(categoryCount, ([name, count]) => ({ name, count })).sort(sortByCount);
  const brandsTop = Array.from(brandCount, ([name, count]) => ({ name, count })).sort(sortByCount);

  const factories = new Set(modules.map((m) => m.factory_src).filter(Boolean));

  const overview: Overview = {
    totalSkus: products.length,
    totalModules: modules.length,
    totalCategories: categoryCount.size,
    totalBrands: brandCount.size,
    totalLinks: links.length,
    zeroSalesSkus: zeroSales,
    factories: factories.size,
    categoriesTop,
    brandsTop,
  };

  store = {
    products,
    modules,
    links,
    competitors,
    overview,
    loadedAt: new Date(),
  };

  return store;
}

export function getStore(): Store {
  if (!store) throw new Error('Data not loaded yet. Call loadData() first.');
  return store;
}

/** 测试/热重载用 */
export function clearStore(): void {
  store = null;
}
