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
