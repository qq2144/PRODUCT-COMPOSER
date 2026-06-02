/**
 * axios 客户端 - 与后端通信
 */
import axios from 'axios';
import type {
  Overview,
  PageResult,
  ProductAsset,
  ProductsQuery,
  Module,
  ComposeResult,
  CategoryMapResult,
  UnderperformList,
  SkuDiagnosis,
  ConceptCardSummary,
  ConceptCardSaved,
  ConceptCardStatus,
  CreateCardInput,
} from './types';

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export const api = {
  health: () => http.get<{ ok: boolean; ts: string }>('/health').then((r) => r.data),

  overview: () => http.get<Overview>('/overview').then((r) => r.data),

  products: (q: ProductsQuery = {}) =>
    http.get<PageResult<ProductAsset>>('/products', { params: q }).then((r) => r.data),

  productDetail: (productAbbrev: string) =>
    http.get<{
      productAbbrev: string;
      totalSpecs: number;
      totalSales: number;
      brands: string[];
      items: ProductAsset[];
    }>(`/products/${encodeURIComponent(productAbbrev)}`).then((r) => r.data),

  modules: (q: { type?: string; factory?: string; hasReuse?: boolean; q?: string; limit?: number; offset?: number } = {}) =>
    http.get<PageResult<Module>>('/modules', { params: q }).then((r) => r.data),

  moduleDetail: (moduleId: string) =>
    http.get<{
      module: Module;
      reuseCount: number;
      relatedProductsCount: number;
      totalSales: number;
      brands: string[];
      links: Array<{ module_id: string; reuse_idx: string; product_name: string; product_code: string; reuse_position: string }>;
      relatedProducts: Array<ProductAsset & { reusePosition: string }>;
    }>(`/modules/${encodeURIComponent(moduleId)}`).then((r) => r.data),

  compose: (text: string) =>
    http.post<ComposeResult>('/compose', { text }).then((r) => r.data),

  categoryMap: (minCategorySize?: number) =>
    http.get<CategoryMapResult>('/category-map', { params: { minCategorySize } }).then((r) => r.data),

  underperform: (q: { category?: string; brand?: string; salesMax?: number; limit?: number; offset?: number } = {}) =>
    http.get<UnderperformList>('/underperform', { params: q }).then((r) => r.data),

  diagnoseSku: (productAbbrev: string) =>
    http.get<SkuDiagnosis>(`/underperform/${encodeURIComponent(productAbbrev)}`).then((r) => r.data),

  // ============ 概念卡 (M5) ============
  saveCard: (input: CreateCardInput) =>
    http.post<ConceptCardSaved>('/cards', input).then((r) => r.data),

  listCards: (
    q: { author?: string; brand?: string; category?: string; quadrant?: string; status?: ConceptCardStatus; q?: string } = {},
  ) =>
    http.get<{ total: number; items: ConceptCardSummary[] }>('/cards', { params: q }).then((r) => r.data),

  getCard: (id: string) =>
    http.get<ConceptCardSaved>(`/cards/${encodeURIComponent(id)}`).then((r) => r.data),

  updateCard: (
    id: string,
    patch: { name?: string; userQuadrant?: string; status?: ConceptCardStatus },
  ) => http.patch<ConceptCardSaved>(`/cards/${encodeURIComponent(id)}`, patch).then((r) => r.data),

  deleteCard: (id: string) =>
    http.delete<{ ok: true }>(`/cards/${encodeURIComponent(id)}`).then((r) => r.data),
};
