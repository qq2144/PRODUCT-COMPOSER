/**
 * 数据类型定义 - 4 张 CSV 的行 schema
 */

/**
 * data/product_assets.csv  (4620 行)
 * 来源：销量汇总表
 */
export interface ProductAsset {
  sku_full_id: string;          // 增强字段，货品编号+规格码
  code: string;                 // 商家编码（H70XLA 等）
  product_code: string;         // 货品编号（ERP 数字内码）
  product_abbrev: string;       // 货品简称（H70/HW63 等业务编号）★ JOIN key
  name: string;                 // 货品名称
  spec: string;                 // 规格名称
  brand: string;                // 品牌
  category: string;             // 分类
  shop: string;                 // 店铺
  sales: number;                // 实际销售量
  price: number;                // 零售价
  cost: number;                 // 货品总成本
  margin: number;               // 毛利率%
  is_zero_sales: boolean;       // 0 销量标记
}

/**
 * data/modules.csv  (363 行)
 * 来源：博凯+宏博工厂模块库
 */
export interface Module {
  module_id: string;            // 模块编号
  module_type_sheet: string;    // 模块类型（版型/面料/魔术贴/...）
  module_name: string;
  factory_src: string;          // 博凯 / 宏博
  material: string;
  color: string;
  price: string;
  size: string;
  design_time: string;
  remark: string;
  image_front_id: string;       // DISPIMG ID
  image_back_id: string;
}

/**
 * data/module_product_link.csv  (534 行)
 * 模块 ↔ 产品复用关系
 */
export interface ModuleProductLink {
  module_id: string;
  reuse_idx: string;
  product_name: string;
  product_code: string;         // 业务编号，可与 ProductAsset.product_abbrev JOIN
  reuse_position: string;
  product_image_id: string;
  factory_src: string;
  module_type_sheet: string;
}

/**
 * data/competitor_intel.csv  (31 行)
 */
export interface CompetitorIntel {
  pallet_file: string;
  month_sheet: string;
  l1_category: string;
  l2_category: string;
  sub_category: string;
  generation: string;
  competitor_url: string;
  competitor_sales_note: string;
  team_upgrade_idea: string;
  source: string;
}

/**
 * 概览统计（驾驶舱用）
 */
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
}
