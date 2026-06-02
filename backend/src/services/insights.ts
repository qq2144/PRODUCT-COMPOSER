/**
 * 洞察服务 - M4
 *
 * 1. getCategoryMap()              品牌 × 品类矩阵（含 SKU 数与销量）
 * 2. listUnderperformSkus(opts)    未起量 SKU 列表（销量=0 或低于阈值）
 * 3. diagnoseSku(productAbbrev)    单 SKU 诊断（同品类客观数据对比，不评判）
 */
import { getStore } from './dataLoader.js';
import type { ProductAsset } from '../types.js';

// =========================================================
// 1. 品牌 × 品类矩阵
// =========================================================
export interface MatrixCell {
  brand: string;
  category: string;
  skuRowCount: number;     // 该品牌×品类的 SKU 销售行数
  totalSales: number;      // 总销量
  isGap: boolean;          // true = 该品牌该品类没有产品
}

export interface CategoryMapResult {
  brands: string[];        // 列（按总 SKU 数降序）
  categories: string[];    // 行（按总 SKU 数降序）
  matrix: MatrixCell[][];  // [row=category][col=brand]
  brandCategoryTotals: Record<string, number>; // 每品牌总 SKU 数
  categorySkuTotals: Record<string, number>;   // 每品类总 SKU 数
  gapsCount: number;       // 总缺口数
  filledCount: number;     // 总已填数
}

export function getCategoryMap(opts?: { minCategorySize?: number }): CategoryMapResult {
  const { products } = getStore();
  const minCategorySize = opts?.minCategorySize ?? 0;

  // 统计每品牌×品类的 SKU 数 + 销量
  const cellMap = new Map<string, { skuRowCount: number; totalSales: number }>();
  const brandCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const p of products) {
    if (!p.brand || !p.category) continue;
    const key = `${p.brand}|${p.category}`;
    const existing = cellMap.get(key);
    if (existing) {
      existing.skuRowCount += 1;
      existing.totalSales += p.sales;
    } else {
      cellMap.set(key, { skuRowCount: 1, totalSales: p.sales });
    }
    brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
    categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
  }

  // 按总 SKU 数降序排列品牌和品类
  const brands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([b]) => b);

  const categories = Array.from(categoryCounts.entries())
    .filter(([, cnt]) => cnt >= minCategorySize)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  // 构建矩阵
  let gapsCount = 0;
  let filledCount = 0;
  const matrix: MatrixCell[][] = categories.map((cat) =>
    brands.map((brand) => {
      const cell = cellMap.get(`${brand}|${cat}`);
      const isGap = !cell;
      if (isGap) gapsCount++;
      else filledCount++;
      return {
        brand,
        category: cat,
        skuRowCount: cell?.skuRowCount ?? 0,
        totalSales: cell?.totalSales ?? 0,
        isGap,
      };
    })
  );

  return {
    brands,
    categories,
    matrix,
    brandCategoryTotals: Object.fromEntries(brandCounts),
    categorySkuTotals: Object.fromEntries(categoryCounts),
    gapsCount,
    filledCount,
  };
}

// =========================================================
// 2. 未起量 SKU 列表
// =========================================================
export interface UnderperformItem {
  productAbbrev: string;
  name: string;
  brand: string;
  category: string;
  shop: string;
  spec: string;
  sales: number;
  price: number;
  margin: number;
  /** 该 SKU 在同品类内按销量的百分位（0-100），越低越差 */
  categoryPercentile: number;
}

export function listUnderperformSkus(opts: {
  category?: string;
  brand?: string;
  /** 销量阈值上限（含），默认 0 = 只看零销量 */
  salesMax?: number;
  limit?: number;
  offset?: number;
}): { total: number; items: UnderperformItem[] } {
  const { products } = getStore();
  const salesMax = opts.salesMax ?? 0;

  // 预计算每品类内的销量排序（用于百分位）
  const categoryPercentile = new Map<string, Map<string, number>>(); // category → product_abbrev → percentile
  const byCategory = new Map<string, ProductAsset[]>();
  for (const p of products) {
    if (!p.category) continue;
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }
  for (const [cat, arr] of byCategory) {
    // 按产品简称聚合销量
    const abbrevTotals = new Map<string, number>();
    for (const p of arr) {
      const key = p.product_abbrev || p.product_code;
      if (!key) continue;
      abbrevTotals.set(key, (abbrevTotals.get(key) ?? 0) + p.sales);
    }
    const sorted = Array.from(abbrevTotals.entries()).sort((a, b) => a[1] - b[1]);
    const total = sorted.length;
    const inner = new Map<string, number>();
    for (let i = 0; i < total; i++) {
      const pct = total === 1 ? 50 : (i / (total - 1)) * 100;
      inner.set(sorted[i]![0], Math.round(pct * 10) / 10);
    }
    categoryPercentile.set(cat, inner);
  }

  let filtered = products.filter((p) => {
    if (p.sales > salesMax) return false;
    if (opts.category && p.category !== opts.category) return false;
    if (opts.brand && p.brand !== opts.brand) return false;
    return true;
  });

  // 按 (品牌, 货品简称) 去重，保留销量最高的一行（避免同 SKU 跨多店铺重复出现）
  const seen = new Map<string, ProductAsset>();
  for (const p of filtered) {
    const key = `${p.brand}|${p.product_abbrev || p.product_code}|${p.spec}`;
    const existing = seen.get(key);
    if (!existing || p.sales > existing.sales) {
      seen.set(key, p);
    }
  }
  const dedup = Array.from(seen.values());

  // 按品类百分位升序（最差的在前）
  dedup.sort((a, b) => {
    const aP = categoryPercentile.get(a.category)?.get(a.product_abbrev || a.product_code) ?? 0;
    const bP = categoryPercentile.get(b.category)?.get(b.product_abbrev || b.product_code) ?? 0;
    return aP - bP;
  });

  const total = dedup.length;
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  const page = dedup.slice(offset, offset + limit).map<UnderperformItem>((p) => ({
    productAbbrev: p.product_abbrev || p.product_code,
    name: p.name,
    brand: p.brand,
    category: p.category,
    shop: p.shop,
    spec: p.spec,
    sales: p.sales,
    price: p.price,
    margin: p.margin,
    categoryPercentile:
      categoryPercentile.get(p.category)?.get(p.product_abbrev || p.product_code) ?? 0,
  }));

  return { total, items: page };
}

// =========================================================
// 3. 单 SKU 诊断（不评判，给客观对比数据）
// =========================================================
export interface SkuDiagnosis {
  target: {
    productAbbrev: string;
    name: string;
    brand: string;
    category: string;
    totalSales: number;
    specs: Array<{ spec: string; shop: string; sales: number; price: number; margin: number }>;
  };
  categoryStats: {
    skuCount: number;            // 同品类独立产品数
    salesDistribution: {         // 同品类销量分布
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      max: number;
    };
    priceDistribution: {
      p25: number;
      p50: number;
      p75: number;
      avg: number;
    };
    targetVsMedian: {
      salesGap: number;         // 该 SKU 销量与中位数的差（负数 = 低于中位）
      pricePosition: 'above' | 'below' | 'equal'; // 价格是高于/低于/接近中位
      priceGapPct: number;      // 价差相对中位数的百分比
    };
  };
  benchmarks: Array<{
    productAbbrev: string;
    name: string;
    brand: string;
    totalSales: number;
    avgPrice: number;
  }>; // 同品类销量 TOP 5，作为对照
}

export function diagnoseSku(productAbbrev: string): SkuDiagnosis | null {
  const { products } = getStore();
  const target = products.filter(
    (p) => p.product_abbrev === productAbbrev || p.product_code === productAbbrev
  );
  if (target.length === 0) return null;

  const first = target[0]!;
  const category = first.category;
  const sameCategory = products.filter((p) => p.category === category);

  // 按产品简称聚合销量
  const abbrevSales = new Map<string, { name: string; brand: string; totalSales: number; prices: number[] }>();
  for (const p of sameCategory) {
    const key = p.product_abbrev || p.product_code;
    if (!key) continue;
    const existing = abbrevSales.get(key);
    if (existing) {
      existing.totalSales += p.sales;
      if (p.price > 0) existing.prices.push(p.price);
    } else {
      abbrevSales.set(key, {
        name: p.name,
        brand: p.brand,
        totalSales: p.sales,
        prices: p.price > 0 ? [p.price] : [],
      });
    }
  }

  const allSalesNums = Array.from(abbrevSales.values()).map((x) => x.totalSales).sort((a, b) => a - b);
  const allPricesNums = Array.from(abbrevSales.values()).flatMap((x) => x.prices).sort((a, b) => a - b);

  function pct(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    return arr[Math.min(arr.length - 1, Math.floor((arr.length * p) / 100))] ?? 0;
  }
  function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((s, n) => s + n, 0) / arr.length;
  }

  const salesDistribution = {
    p25: pct(allSalesNums, 25),
    p50: pct(allSalesNums, 50),
    p75: pct(allSalesNums, 75),
    p90: pct(allSalesNums, 90),
    max: allSalesNums[allSalesNums.length - 1] ?? 0,
  };
  const priceDistribution = {
    p25: pct(allPricesNums, 25),
    p50: pct(allPricesNums, 50),
    p75: pct(allPricesNums, 75),
    avg: Math.round(avg(allPricesNums) * 100) / 100,
  };

  const targetTotalSales = target.reduce((s, p) => s + p.sales, 0);
  const targetPrices = target.map((p) => p.price).filter((x) => x > 0);
  const targetAvgPrice = targetPrices.length ? avg(targetPrices) : 0;
  const priceMedian = priceDistribution.p50;
  const priceGapPct = priceMedian > 0 ? ((targetAvgPrice - priceMedian) / priceMedian) * 100 : 0;

  const targetVsMedian = {
    salesGap: targetTotalSales - salesDistribution.p50,
    pricePosition:
      Math.abs(priceGapPct) < 5 ? ('equal' as const) :
      priceGapPct > 0 ? ('above' as const) : ('below' as const),
    priceGapPct: Math.round(priceGapPct * 10) / 10,
  };

  // 同品类销量 TOP 5
  const benchmarks = Array.from(abbrevSales.entries())
    .filter(([code]) => code !== (first.product_abbrev || first.product_code))
    .sort((a, b) => b[1].totalSales - a[1].totalSales)
    .slice(0, 5)
    .map(([code, info]) => ({
      productAbbrev: code,
      name: info.name,
      brand: info.brand,
      totalSales: info.totalSales,
      avgPrice: info.prices.length ? Math.round(avg(info.prices) * 100) / 100 : 0,
    }));

  return {
    target: {
      productAbbrev: first.product_abbrev || first.product_code,
      name: first.name,
      brand: first.brand,
      category: first.category,
      totalSales: targetTotalSales,
      specs: target.map((p) => ({
        spec: p.spec,
        shop: p.shop,
        sales: p.sales,
        price: p.price,
        margin: p.margin,
      })),
    },
    categoryStats: {
      skuCount: abbrevSales.size,
      salesDistribution,
      priceDistribution,
      targetVsMedian,
    },
    benchmarks,
  };
}
