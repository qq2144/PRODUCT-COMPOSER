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
export interface ParsedIntent {
  category: string;
  userScenes: string[];
  functions: string[];
  brand: string;
  style: string;
  rawText: string;
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

export interface OpportunityQuadrant {
  label: '明星' | '潜力' | '红海' | '鸡肋' | '未知';
  emoji: string;
  marketSize: 'large' | 'small';
  demandStrength: 'strong' | 'weak';
  reasoning: string;
}

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
  opportunityQuadrant: OpportunityQuadrant;
  conceptCardDraft: ConceptCardDraft;
}
