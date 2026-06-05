/**
 * 前端类型定义 - 与后端 backend/src/types.ts 保持一致
 */

export interface ProductAsset {
  sku_full_id: string;
  code: string;
  product_code: string;
  product_abbrev: string;
  name: string;
  spec: string;
  brand: string;
  category: string;
  shop: string;
  sales: number;
  price: number;
  cost: number;
  margin: number;
  is_zero_sales: boolean;
}

export interface Module {
  module_id: string;
  module_type_sheet: string;
  module_name: string;
  factory_src: string;
  material: string;
  color: string;
  price: string;
  size: string;
  design_time: string;
  remark: string;
  image_front_id: string;
  image_back_id: string;
  reuse_count?: number;
}

export interface Overview {
  totalSkus: number;
  totalModules: number;
  totalCategories: number;
  totalBrands: number;
  totalLinks: number;
  zeroSalesSkus: number;
  factories: number;
  categoriesTop: Array<{ name: string; count: number }>;
  brandsTop: Array<{ name: string; count: number }>;
  /** M5：本月新增模块数 */
  newModulesThisMonth: number;
  /** M5：模块引用 TOP 5 */
  moduleReuseTop: Array<{ moduleId: string; moduleName: string; reuseCount: number }>;
  /** M5：本月新增概念卡数 */
  newCardsThisMonth: number;
  loadedAt: string;
}

export interface PageResult<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export interface ProductsQuery {
  brand?: string;
  category?: string;
  salesMin?: number;
  priceMin?: number;
  priceMax?: number;
  zeroOnly?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

// ============ 组合器 (M3) ============
// v1.1 起：5 维度全部 string[]，可自由增减
export interface ParsedIntent {
  categories: string[];
  brands: string[];
  userScenes: string[];
  functions: string[];
  styles: string[];
  rawText: string;
}

/** 兼容老的 ConceptCard payload（v1 单值字段） */
export interface ParsedIntentLegacy {
  category?: string;
  brand?: string;
  style?: string;
  userScenes?: string[];
  functions?: string[];
  rawText?: string;
}

export interface MatchedModule {
  moduleId: string;
  moduleType: string;
  moduleName: string;
  factory: string;
  material: string;
  reuseCount: number;
  matchReason: string;
  matchedKeywords: string[];
}

export interface AssetComparison {
  sameCategorySkuCount: number;
  sameCategoryBrands: string[];
  topSeller: {
    productAbbrev: string;
    name: string;
    brand: string;
    totalSales: number;
  } | null;
  totalSalesInCategory: number;
  competitorIntelCount: number;
}

/** 4 象限标签 - 用户自选，不由系统判定 */
export type QuadrantLabel = 'star' | 'potential' | 'redsea' | 'chicken' | '';

export interface ConceptCardDraft {
  name: string;
  summary: string;
  moduleCount: number;
  needsValidation: string[];
}

export interface ComposeResult {
  parsedIntent: ParsedIntent;
  matchedModules: Record<string, MatchedModule[]>;
  totalMatchedModules: number;
  assetComparison: AssetComparison;
  conceptCardDraft: ConceptCardDraft;
}

// ============ 概念卡持久化 (M5) ============
export type ConceptCardStatus = 'draft' | 'discussion' | 'sample' | 'archived';

export interface ConceptCardSummary {
  id: string;
  name: string;
  summary: string;
  rawText: string;
  userQuadrant: string;
  author: string;
  status: ConceptCardStatus;
  note: string;
  totalMatchedModules: number;
  parsedCategory: string;
  parsedBrand: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptCardSaved extends ConceptCardSummary {
  payload: {
    parsedIntent: ParsedIntent;
    matchedModules: Record<string, MatchedModule[]>;
    totalMatchedModules: number;
    assetComparison: AssetComparison;
    conceptCardDraft: ConceptCardDraft;
  };
}

export interface CreateCardInput {
  name: string;
  summary: string;
  rawText: string;
  userQuadrant: string;
  author?: string;
  note?: string;
  payload: ConceptCardSaved['payload'];
}

// ============ 品类地图 (M4) ============
export interface MatrixCell {
  brand: string;
  category: string;
  skuRowCount: number;
  totalSales: number;
  isGap: boolean;
}

export interface CategoryMapResult {
  brands: string[];
  categories: string[];
  matrix: MatrixCell[][];
  brandCategoryTotals: Record<string, number>;
  categorySkuTotals: Record<string, number>;
  gapsCount: number;
  filledCount: number;
}

// ============ 未起量诊断 (M4) ============
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
  categoryPercentile: number;
}

export interface UnderperformList {
  total: number;
  items: UnderperformItem[];
}

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
    skuCount: number;
    salesDistribution: { p25: number; p50: number; p75: number; p90: number; max: number };
    priceDistribution: { p25: number; p50: number; p75: number; avg: number };
    targetVsMedian: {
      salesGap: number;
      pricePosition: 'above' | 'below' | 'equal';
      priceGapPct: number;
    };
  };
  benchmarks: Array<{
    productAbbrev: string;
    name: string;
    brand: string;
    totalSales: number;
    avgPrice: number;
  }>;
}
