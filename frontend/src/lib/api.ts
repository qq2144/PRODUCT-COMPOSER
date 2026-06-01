/**
 * axios 客户端 - 与后端通信
 */
import axios from 'axios';
import type { Overview, PageResult, ProductAsset, ProductsQuery, Module, ComposeResult } from './types';

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
};
