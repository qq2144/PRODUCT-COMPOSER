<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import type { ProductAsset, Overview } from '../lib/types';

  let overview = $state<Overview | null>(null);
  let products = $state<ProductAsset[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // 筛选条件
  let filterBrand = $state('');
  let filterCategory = $state('');
  let filterSalesMin = $state('');
  let searchQ = $state('');
  let zeroOnly = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function fetchProducts() {
    loading = true;
    error = null;
    try {
      const result = await api.products({
        brand: filterBrand || undefined,
        category: filterCategory || undefined,
        salesMin: filterSalesMin ? Number(filterSalesMin) : undefined,
        zeroOnly: zeroOnly || undefined,
        q: searchQ || undefined,
        limit: 50,
      });
      products = result.items;
      total = result.total;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      products = [];
      total = 0;
    } finally {
      loading = false;
    }
  }

  function debouncedFetch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchProducts, 250);
  }

  function clearFilters() {
    filterBrand = '';
    filterCategory = '';
    filterSalesMin = '';
    searchQ = '';
    zeroOnly = false;
    fetchProducts();
  }

  onMount(async () => {
    try {
      overview = await api.overview();
    } catch (e) {
      // 没有 overview 也能跑
    }
    await fetchProducts();
  });
</script>

<div class="query-page">
  <h1>🔍 产品查询中心</h1>
  <p class="sub">真实 4620 SKU · 9 个品牌 · 77 个品类</p>

  <!-- 筛选条 -->
  <div class="filter-bar card">
    <div class="filter-row">
      <label>
        <span>品牌</span>
        <select class="input" bind:value={filterBrand} onchange={fetchProducts}>
          <option value="">全部</option>
          {#if overview}
            {#each overview.brandsTop as b (b.name)}
              <option value={b.name}>{b.name} ({b.count})</option>
            {/each}
          {/if}
        </select>
      </label>

      <label>
        <span>品类</span>
        <select class="input" bind:value={filterCategory} onchange={fetchProducts}>
          <option value="">全部</option>
          {#if overview}
            {#each overview.categoriesTop as c (c.name)}
              <option value={c.name}>{c.name} ({c.count})</option>
            {/each}
          {/if}
        </select>
      </label>

      <label>
        <span>销量 ≥</span>
        <input
          class="input narrow"
          type="number"
          placeholder="0"
          bind:value={filterSalesMin}
          oninput={debouncedFetch}
        />
      </label>

      <label class="checkbox">
        <input type="checkbox" bind:checked={zeroOnly} onchange={fetchProducts} />
        <span>仅看未起量 (0 销量)</span>
      </label>

      <input
        class="input search"
        type="text"
        placeholder="🔍 搜货号 / 货品名 / 规格"
        bind:value={searchQ}
        oninput={debouncedFetch}
      />

      <button class="btn btn-ghost btn-sm" onclick={clearFilters}>清空</button>
    </div>
  </div>

  <!-- 结果状态 -->
  <div class="result-bar">
    {#if loading}
      <span class="muted">查询中...</span>
    {:else if error}
      <span class="error-text">❌ {error}（请确认后端运行 <code>pnpm dev:backend</code>）</span>
    {:else}
      <span>
        共匹配 <strong>{total.toLocaleString()}</strong> 个 SKU，显示前
        <strong>{products.length}</strong> 个（按销量降序）
      </span>
    {/if}
  </div>

  <!-- 表格 -->
  {#if products.length > 0}
    <div class="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>品牌</th>
            <th>品类</th>
            <th>货品简称</th>
            <th>名称</th>
            <th>规格</th>
            <th class="num">销量</th>
            <th class="num">零售价</th>
            <th class="num">毛利%</th>
            <th>店铺</th>
          </tr>
        </thead>
        <tbody>
          {#each products as p (p.code)}
            <tr>
              <td><span class="pill pill-primary">{p.brand}</span></td>
              <td><span class="pill pill-info">{p.category}</span></td>
              <td><code>{p.product_abbrev}</code></td>
              <td>{p.name}</td>
              <td>{p.spec || '—'}</td>
              <td class="num" class:sales-hot={p.sales >= 100} class:sales-zero={p.is_zero_sales}>
                {p.sales}
              </td>
              <td class="num">{p.price ? '¥' + p.price : '—'}</td>
              <td class="num">{p.margin ? p.margin.toFixed(1) + '%' : '—'}</td>
              <td class="muted small">{p.shop}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if !loading && !error}
    <div class="card empty">没有匹配的 SKU。调整筛选条件或清空再试。</div>
  {/if}
</div>

<style>
  .query-page h1 {
    font-size: 24px;
    margin-bottom: 4px;
  }
  .sub {
    color: var(--gray-500);
    font-size: 13px;
    margin-bottom: 20px;
  }
  .filter-bar {
    margin-bottom: 14px;
    padding: 14px 18px;
  }
  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
  }
  .filter-row label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--gray-500);
  }
  .input.narrow {
    width: 100px;
  }
  .input.search {
    flex: 1;
    min-width: 200px;
  }
  .checkbox {
    flex-direction: row !important;
    align-items: center !important;
    gap: 6px !important;
    color: var(--gray-700) !important;
    padding-bottom: 8px;
  }
  .result-bar {
    padding: 6px 12px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--gray-700);
  }
  .result-bar .muted {
    color: var(--gray-400);
  }
  .result-bar .error-text {
    color: var(--danger);
  }
  .table-wrap {
    padding: 0;
    overflow: auto;
    max-height: 70vh;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  thead th {
    background: var(--gray-100);
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    color: var(--gray-700);
    font-size: 12px;
    border-bottom: 2px solid var(--gray-300);
    position: sticky;
    top: 0;
    z-index: 1;
  }
  tbody td {
    padding: 9px 14px;
    border-bottom: 1px solid var(--gray-100);
  }
  tbody tr:hover td {
    background: var(--gray-50);
  }
  td.num,
  th.num {
    font-family: var(--font-mono);
    text-align: right;
  }
  td.sales-hot {
    color: var(--success);
    font-weight: 700;
  }
  td.sales-zero {
    color: var(--danger);
  }
  td.muted {
    color: var(--gray-500);
  }
  td.small {
    font-size: 11px;
  }
  .empty {
    padding: 60px;
    text-align: center;
    color: var(--gray-500);
  }
</style>
