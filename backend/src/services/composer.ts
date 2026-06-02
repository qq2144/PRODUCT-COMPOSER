/**
 * 组合器核心 - M3
 *
 * 输入：自然语言文本
 * 处理：
 *   1. 解析 5 维度（品类/场景/功能/品牌/风格）
 *   2. 在 modules 库匹配 6 类模块
 *   3. 同品类资产对照（爆品/平均销量/SKU 数）
 *   4. 4 象限机会判定（数据驱动，不靠 AI）
 *   5. 生成概念卡草案
 *
 * 注：v1 阶段 parseIntent 用规则+关键词，未来接入 LLM 只换这个函数。
 */
import { getStore } from './dataLoader.js';
import type { Module, ModuleProductLink, ProductAsset } from '../types.js';

// ============ 关键词字典 ============
// 品牌/品类直接从 product_assets 自动取（动态）
// 场景/功能/风格手写（业务定义）

const SCENE_KEYWORDS: Record<string, string[]> = {
  '户外运动': ['户外', '跑步', '篮球', '足球', '骑行', '登山', '徒步', '越野', '攀岩'],
  '居家睡眠': ['居家', '睡眠', '睡觉', '床上', '入睡', '夜间', '夜里'],
  '通勤': ['通勤', '上班', '办公', '日常', '出门', '上下班'],
  '高强度训练': ['高强度', '训练', '健身房', '健身', '比赛', '深蹲', '硬拉', '负重'],
  '康复修复': ['康复', '修复', '受伤', '骨折', '术后', '理疗', '矫正', '保养'],
  '球类运动': ['羽毛球', '乒乓球', '网球', '排球', '高尔夫', '台球'],
  '瑜伽普拉提': ['瑜伽', '普拉提', '拉伸', '柔韧'],
  '冷热环境': ['夏天', '冬天', '夏季', '冬季', '高温', '低温', '雨天'],
};

const FUNCTION_KEYWORDS: Record<string, string[]> = {
  '舒适': ['舒适', '舒服', '柔软', '亲肤', '不勒', '体感好', '丝滑', '细腻'],
  '包裹性': ['包裹', '贴合', '紧致', '固定', '裹住', '不松垮'],
  '支撑': ['支撑', '稳定', '强支撑', '硬挺', '不晃', '保护', '稳固', '防护'],
  '防滑': ['防滑', '不滑', '不掉', '抓地', '止滑'],
  '透气': ['透气', '排汗', '吸汗', '不闷', '凉爽', '冰感', '速干', '不黏', '清爽'],
  '保暖': ['保暖', '加绒', '暖和', '热感', '蓄热', '锁温', '不冷'],
  '助眠': ['助眠', '安神', '深睡', '助眠', '放松', '静音', '不刺激'],
  '加压': ['加压', '压缩', '塑形', '紧身', '收腹'],
  '减震': ['减震', '缓震', '缓冲', '吸震', '抗冲击'],
  '抗菌防臭': ['抗菌', '防臭', '除味', '清洁', '银离子'],
  '弹性': ['弹性', '弹力', '回弹', '韧性'],
  '轻量': ['轻', '轻量', '轻薄', '便携', '不累赘'],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  '运动专业': ['运动专业', '专业', '运动风', '专业感'],
  '极简': ['极简', '简约', '低调', '纯色', '素色', '干净'],
  '医疗感': ['医疗', '专业医疗', '修复感', '康复风', '诊所感'],
  '国潮': ['国潮', '中国风', '复古', '汉风', '东方'],
  '时尚': ['时尚', '潮', '潮流', '街头', '潮酷', '街拍'],
  '户外硬核': ['硬核', '机能', '军工', '战术', '工装'],
  '少女': ['少女', '可爱', '甜美', '萌'],
  '高端': ['高端', '轻奢', '精致', '质感'],
};

// ============ Types ============
export interface ParsedIntent {
  category: string;            // 品类（最多 1 个，匹配 product_assets.category）
  userScenes: string[];        // 用户场景（可多个）
  functions: string[];         // 功能感受（可多个）
  brand: string;               // 品牌（最多 1 个）
  style: string;               // 风格调性（最多 1 个）
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

export type ModuleMatchByDimension = Record<string, MatchedModule[]>;

export interface AssetComparison {
  sameCategorySkuCount: number;   // 同品类自家 SKU 销售行数
  sameCategoryBrands: string[];   // 同品类有产品的品牌
  topSeller: {
    productAbbrev: string;
    name: string;
    brand: string;
    totalSales: number;
  } | null;
  totalSalesInCategory: number;
  competitorIntelCount: number;   // 同品类竞品情报条数
}

export interface ConceptCardDraft {
  name: string;
  summary: string;
  moduleCount: number;
  needsValidation: string[];
}

export interface ComposeResult {
  parsedIntent: ParsedIntent;
  matchedModules: ModuleMatchByDimension;
  totalMatchedModules: number;
  assetComparison: AssetComparison;
  /** v1 阶段不做自动判定。象限由用户在前端基于事实数据自行选择并保存。 */
  conceptCardDraft: ConceptCardDraft;
}

// ============ Step 1: 解析 5 维度 ============
function parseIntent(text: string, allCategories: string[], allBrands: string[]): ParsedIntent {
  const lowText = text.toLowerCase();

  // 品类匹配 - 两步：① 直接包含搜索 ② 反向模糊（品类名包含输入的短词）
  // 优先匹配长字符串（避免"护膝"误匹配到"膝"）
  const sortedCats = [...allCategories].sort((a, b) => b.length - a.length);
  let category = '';
  for (const c of sortedCats) {
    if (c && text.includes(c)) {
      category = c;
      break;
    }
  }
  // 反向模糊：输入"护腰" 匹配 "运动护腰"/"健身护腰"；输入"眼罩" 匹配 "睡眠眼罩"
  // 取 2 字以上的可能品类词试探
  if (!category) {
    const candidates: string[] = [];
    for (const c of sortedCats) {
      if (c.length <= 2) continue;
      // 用品类名末尾 2-3 字尝试匹配，比如 "运动护腰" → "护腰"
      for (let len = 2; len <= Math.min(4, c.length); len++) {
        const tail = c.slice(-len);
        if (tail.length >= 2 && text.includes(tail)) {
          candidates.push(c);
          break;
        }
      }
    }
    if (candidates.length > 0) {
      // 取最短的（最具体）品类
      category = candidates.sort((a, b) => a.length - b.length)[0] ?? '';
    }
  }

  // 品牌匹配（大小写不敏感）
  let brand = '';
  for (const b of allBrands) {
    if (b && lowText.includes(b.toLowerCase())) {
      brand = b;
      break;
    }
  }

  // 场景：所有命中的都返回
  const userScenes: string[] = [];
  for (const [scene, kws] of Object.entries(SCENE_KEYWORDS)) {
    if (kws.some((kw) => text.includes(kw))) userScenes.push(scene);
  }

  // 功能感受：所有命中
  const functions: string[] = [];
  for (const [fn, kws] of Object.entries(FUNCTION_KEYWORDS)) {
    if (kws.some((kw) => text.includes(kw))) functions.push(fn);
  }

  // 风格：取第一个命中
  let style = '';
  for (const [s, kws] of Object.entries(STYLE_KEYWORDS)) {
    if (kws.some((kw) => text.includes(kw))) {
      style = s;
      break;
    }
  }

  return { category, userScenes, functions, brand, style, rawText: text };
}

// ============ Step 2: 模块匹配 ============
function matchModules(
  intent: ParsedIntent,
  modules: Module[],
  links: ModuleProductLink[]
): ModuleMatchByDimension {
  // 预算每模块复用次数
  const reuseCount = new Map<string, number>();
  for (const l of links) {
    reuseCount.set(l.module_id, (reuseCount.get(l.module_id) ?? 0) + 1);
  }

  // 把意图中的所有功能词 + 品牌词 + 风格词组合成查询词
  const queryTerms: string[] = [];
  for (const fn of intent.functions) {
    queryTerms.push(...(FUNCTION_KEYWORDS[fn] ?? []));
  }
  if (intent.brand) queryTerms.push(intent.brand.toLowerCase());
  if (intent.style) queryTerms.push(...(STYLE_KEYWORDS[intent.style] ?? []));

  // 按模块类型分组
  const result: ModuleMatchByDimension = {};

  for (const m of modules) {
    const hay = (m.module_name + ' ' + m.material + ' ' + m.color).toLowerCase();
    const matched: string[] = [];
    for (const q of queryTerms) {
      if (q && hay.includes(q.toLowerCase())) matched.push(q);
    }
    if (matched.length === 0) continue;

    const dim = m.module_type_sheet || '其他';
    if (!result[dim]) result[dim] = [];

    result[dim].push({
      moduleId: m.module_id,
      moduleType: m.module_type_sheet,
      moduleName: m.module_name,
      factory: m.factory_src,
      material: m.material,
      reuseCount: reuseCount.get(m.module_id) ?? 0,
      matchedKeywords: Array.from(new Set(matched)),
      matchReason: `命中关键词：${Array.from(new Set(matched)).join('、')}`,
    });
  }

  // 每个维度按 (匹配关键词数 desc, 复用次数 desc) 排序，最多保留 5 个
  for (const dim of Object.keys(result)) {
    result[dim]!.sort((a, b) => {
      if (b.matchedKeywords.length !== a.matchedKeywords.length) {
        return b.matchedKeywords.length - a.matchedKeywords.length;
      }
      return b.reuseCount - a.reuseCount;
    });
    result[dim] = result[dim]!.slice(0, 5);
  }

  return result;
}

// ============ Step 3: 资产对照分析 ============
function getAssetComparison(
  intent: ParsedIntent,
  products: ProductAsset[],
  competitors: Array<{ l1_category: string }>
): AssetComparison {
  if (!intent.category) {
    return {
      sameCategorySkuCount: 0,
      sameCategoryBrands: [],
      topSeller: null,
      totalSalesInCategory: 0,
      competitorIntelCount: 0,
    };
  }

  const sameCategoryProducts = products.filter((p) => p.category === intent.category);

  const brandSet = new Set<string>();
  const productAbbrevSales = new Map<string, { name: string; brand: string; totalSales: number }>();
  let totalSales = 0;

  for (const p of sameCategoryProducts) {
    if (p.brand) brandSet.add(p.brand);
    totalSales += p.sales;
    const key = p.product_abbrev || p.product_code;
    if (!key) continue;
    const existing = productAbbrevSales.get(key);
    if (existing) {
      existing.totalSales += p.sales;
    } else {
      productAbbrevSales.set(key, { name: p.name, brand: p.brand, totalSales: p.sales });
    }
  }

  // 找爆品 top 1
  let topSeller: AssetComparison['topSeller'] = null;
  let maxSales = 0;
  for (const [abbrev, info] of productAbbrevSales) {
    if (info.totalSales > maxSales) {
      maxSales = info.totalSales;
      topSeller = {
        productAbbrev: abbrev,
        name: info.name,
        brand: info.brand,
        totalSales: info.totalSales,
      };
    }
  }

  const competitorIntelCount = competitors.filter((c) => c.l1_category === intent.category).length;

  return {
    sameCategorySkuCount: sameCategoryProducts.length,
    sameCategoryBrands: Array.from(brandSet).sort(),
    topSeller,
    totalSalesInCategory: totalSales,
    competitorIntelCount,
  };
}

// ============ Step 4: 概念卡草案 ============
// 注：v1 不做 4 象限自动判定。象限标签由用户在前端基于事实数据自行选择。
function generateConceptCard(
  intent: ParsedIntent,
  matched: ModuleMatchByDimension,
  comparison: AssetComparison
): ConceptCardDraft {
  // 名字：[品牌] + [风格?] + [品类] 草案
  const nameparts: string[] = [];
  if (intent.brand) nameparts.push(intent.brand);
  if (intent.style) nameparts.push(intent.style);
  if (intent.category) nameparts.push(intent.category);
  const baseName = nameparts.join(' ').trim() || '新概念产品';
  const name = `${baseName} v1 草案`;

  const moduleCount = Object.values(matched).reduce((sum, arr) => sum + arr.length, 0);

  // summary
  const fnText = intent.functions.length > 0 ? `主打${intent.functions.join('、')}` : '';
  const sceneText = intent.userScenes.length > 0 ? `面向${intent.userScenes.join('、')}场景` : '';
  const benchmark = comparison.topSeller
    ? `对标自家爆品 ${comparison.topSeller.brand} ${comparison.topSeller.productAbbrev}（销量 ${comparison.topSeller.totalSales}）`
    : '';

  const summary = [fnText, sceneText, benchmark].filter(Boolean).join('；') || '基于解析维度的初步草案';

  // 缺少哪些维度的模块
  const needsValidation: string[] = [];
  const expectedDims = ['版型模块', '面料模块', '功能模块'];
  for (const dim of expectedDims) {
    if (!matched[dim] || matched[dim]!.length === 0) {
      needsValidation.push(`${dim}：暂无匹配，建议补关键词或人工挑选`);
    }
  }
  if (!intent.brand) needsValidation.push('品牌：未指定，建议明确归属品牌');
  if (!intent.category) needsValidation.push('品类：未识别到已有品类，可能是品类地图缺失机会');

  return { name, summary, moduleCount, needsValidation };
}

// ============ 总入口 ============
export async function compose(text: string): Promise<ComposeResult> {
  const { products, modules, links, competitors, overview } = getStore();

  const allCategories = overview.categoriesTop.map((c) => c.name);
  const allBrands = overview.brandsTop.map((b) => b.name);

  const parsedIntent = parseIntent(text, allCategories, allBrands);
  const matchedModules = matchModules(parsedIntent, modules, links);
  const totalMatchedModules = Object.values(matchedModules).reduce((s, arr) => s + arr.length, 0);
  const assetComparison = getAssetComparison(parsedIntent, products, competitors);
  const conceptCardDraft = generateConceptCard(parsedIntent, matchedModules, assetComparison);

  return {
    parsedIntent,
    matchedModules,
    totalMatchedModules,
    assetComparison,
    conceptCardDraft,
  };
}
