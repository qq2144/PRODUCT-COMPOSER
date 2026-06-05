<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Icon from '../lib/Icon.svelte';
  import type { ProductAsset, Overview, Module } from '../lib/types';

  type TabKey = 'category' | 'brand' | 'module' | 'zero';

  let activeTab = $state<TabKey>('category');
  let overview = $state<Overview | null>(null);

  // 左侧列表数据
  let modules = $state<(Module & { reuse_count?: number })[]>([]);
  let sideSearch = $state('');

  // 当前选中
  let selectedKey = $state<string | null>(null);

  // 右侧表格数据
  let products = $state<ProductAsset[]>([]);
  let productsTotal = $state(0);
  let moduleDetail = $state<{
    moduleName: string;
    moduleType: string;
    factory: string;
    material: string;
    reuseCount: number;
    relatedProductsCount: number;
    totalSales: number;
    brands: string[];
    relatedProducts: Array<ProductAsset & { reusePosition: string }>;
  } | null>(null);

  let loading = $state(false);
  let error = $state<string | null>(null);

  // 全局筛选条件
  let filterBrand = $state('');
  let filterCategory = $state('');
  let filterSalesMin = $state('');
  let searchQ = $state('');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ============= 左侧列表 =============
  const sideList = $derived.by(() => {
    if (activeTab === 'category') {
      const items = overview?.categoriesTop ?? [];
      const q = sideSearch.toLowerCase();
      return items
        .filter((c) => !q || c.name.toLowerCase().includes(q))
        .map((c) => ({ key: c.name, label: c.name, num: c.count, badge: '' }));
    }
    if (activeTab === 'brand') {
      const items = overview?.brandsTop ?? [];
      const q = sideSearch.toLowerCase();
      return items
        .filter((b) => !q || b.name.toLowerCase().includes(q))
        .map((b) => ({ key: b.name, label: b.name, num: b.count, badge: '' }));
    }
    if (activeTab === 'module') {
      const q = sideSearch.toLowerCase();
      return modules
        .filter((m) =>
          !q ||
          m.module_id.toLowerCase().includes(q) ||
          m.module_name.toLowerCase().includes(q)
        )
        .map((m) => ({
          key: m.module_id,
          label: `${m.module_id} · ${(m.module_name || '').slice(0, 18)}`,
          num: m.reuse_count ?? 0,
          badge: m.module_type_sheet ?? '',
        }));
    }
    return [];
  });

  // ============= Tab 切换 =============
  async function switchTab(tab: TabKey) {
    activeTab = tab;
    selectedKey = null;
    sideSearch = '';
    moduleDetail = null;
    products = [];
    productsTotal = 0;
    error = null;

    if (tab === 'module' && modules.length === 0) {
      // 第一次进 module tab 拉一下模块列表
      loading = true;
      try {
        const r = await api.modules({ hasReuse: true, limit: 500 });
        modules = r.items;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    }

    if (tab === 'zero') {
      // 未起量 tab 直接拉所有 0 销量 SKU
      await fetchProducts();
    }
  }

  // ============= 选中分组项 =============
  async function selectKey(key: string) {
    selectedKey = key;
    moduleDetail = null;
    products = [];
    error = null;

    if (activeTab === 'module') {
      loading = true;
      try {
        const detail = await api.moduleDetail(key);
        moduleDetail = {
          moduleName: detail.module.module_name,
          moduleType: detail.module.module_type_sheet,
          factory: detail.module.factory_src,
          material: detail.module.material,
          reuseCount: detail.reuseCount,
          relatedProductsCount: detail.relatedProductsCount,
          totalSales: detail.totalSales,
          brands: detail.brands,
          relatedProducts: detail.relatedProducts,
        };
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    } else {
      // category / brand：用全局筛选 + 选中维度
      await fetchProducts();
    }
  }

  // ============= 拉 SKU 列表 =============
  async function fetchProducts() {
    loading = true;
    error = null;
    try {
      const params: Record<string, unknown> = {
        limit: 100,
      };
      // 当前 tab 维度
      if (activeTab === 'category' && selectedKey) params.category = selectedKey;
      if (activeTab === 'brand' && selectedKey) params.brand = selectedKey;
      if (activeTab === 'zero') params.zeroOnly = true;

      // 全局筛选叠加
      if (filterBrand) params.brand = filterBrand;
      if (filterCategory) params.category = filterCategory;
      if (filterSalesMin) params.salesMin = Number(filterSalesMin);
      if (searchQ) params.q = searchQ;

      const r = await api.products(params);
      products = r.items;
      productsTotal = r.total;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      products = [];
      productsTotal = 0;
    } finally {
      loading = false;
    }
  }

  function debouncedFetch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (activeTab !== 'module') fetchProducts();
    }, 250);
  }

  function clearGlobalFilters() {
    filterBrand = '';
    filterCategory = '';
    filterSalesMin = '';
    searchQ = '';
    if (activeTab !== 'module') fetchProducts();
  }

  // ============= 初始化 =============
  onMount(async () => {
    try {
      overview = await api.overview();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  // 全局筛选变化时，如果当前在 category/brand/zero tab 且有选中，重拉
  $effect(() => {
    // 引用一下变量让 effect 追踪
    void filterBrand;
    void filterCategory;
    void filterSalesMin;
    void searchQ;
    if (activeTab !== 'module' && (selectedKey || activeTab === 'zero')) {
      debouncedFetch();
    }
  });
</script>

<div class="query-page">
  <h1><Icon name="search" size={20} /> 产品查询中心</h1>
  <p class="sub">4 个维度任意切换 + 多维筛选 · 真实 4620 SKU / 363 模块</p>

  <!-- Tab -->
  <div class="tabs">
    <button class="tab" class:active={activeTab === 'category'} onclick={() => switchTab('category')}>
      <Icon name="boxes" size={14} /> 按品类 <span class="tab-num">{overview?.totalCategories ?? '-'}</span>
    </button>
    <button class="tab" class:active={activeTab === 'brand'} onclick={() => switchTab('brand')}>
      <Icon name="tag" size={14} /> 按品牌 <span class="tab-num">{overview?.totalBrands ?? '-'}</span>
    </button>
    <button class="tab" class:active={activeTab === 'module'} onclick={() => switchTab('module')}>
      <Icon name="puzzle" size={14} /> 按模块 <span class="tab-num">{overview?.totalModules ?? '-'}</span>
    </button>
    <button class="tab" class:active={activeTab === 'zero'} onclick={() => switchTab('zero')}>
      <Icon name="alert-triangle" size={14} /> 未起量 <span class="tab-num">{overview?.zeroSalesSkus ?? '-'}</span>
    </button>
  </div>

  <!-- 全局筛选条 -->
  <div class="filter-bar card">
    <div class="filter-row">
      <label>
        <span>品牌</span>
        <select class="input" bind:value={filterBrand}>
          <option value="">全部</option>
          {#if overview}
            {#each overview.brandsTop as b (b.name)}<option value={b.name}>{b.name} ({b.count})</option>{/each}
          {/if}
        </select>
      </label>
      <label>
        <span>品类</span>
        <select class="input" bind:value={filterCategory}>
          <option value="">全部</option>
          {#if overview}
            {#each overview.categoriesTop as c (c.name)}<option value={c.name}>{c.name} ({c.count})</option>{/each}
          {/if}
        </select>
      </label>
      <label>
        <span>销量 ≥</span>
        <input class="input narrow" type="number" placeholder="0" bind:value={filterSalesMin} />
      </label>
      <input class="input search" type="text" placeholder="搜货号 / 货品名 / 规格" bind:value={searchQ} />
      <button class="btn btn-ghost btn-sm" onclick={clearGlobalFilters}>清空</button>
    </div>
  </div>

  <!-- 主体：左侧 + 右侧 -->
  <div class="main">
    <aside class="side">
      <div class="side-header">
        <h3>{activeTab === 'category' ? '选择品类' : activeTab === 'brand' ? '选择品牌' : activeTab === 'module' ? '选择模块' : '未起量直接列出'}</h3>
        {#if activeTab !== 'zero'}
          <input class="input side-search" type="text" placeholder="筛选..." bind:value={sideSearch} />
        {/if}
      </div>

      {#if activeTab === 'zero'}
        <div class="side-zero-tip">
          <Icon name="alert-triangle" size={13} /> 233 个 0 销量 SKU 已在右侧直接显示<br>
          <span style="opacity:0.7;font-size:11px;">用顶部筛选条缩小范围</span>
        </div>
      {:else if loading && sideList.length === 0}
        <div class="muted"><Icon name="loader-2" size={13} class="spin" /> 加载中…</div>
      {:else}
        <div class="side-list">
          {#each sideList as item (item.key)}
            <button
              class="side-item"
              class:selected={selectedKey === item.key}
              onclick={() => selectKey(item.key)}
            >
              <span class="side-item-label">
                {item.label}
                {#if item.badge}<span class="pill pill-info" style="margin-left:6px;font-size:10px;">{item.badge}</span>{/if}
              </span>
              <span class="side-item-num">{item.num}</span>
            </button>
          {/each}
        </div>
      {/if}
    </aside>

    <section class="content">
      {#if error}
        <div class="card error">
          <Icon name="alert-circle" size={14} /> {error}
          <p style="margin-top:6px;font-size:12px;">请确认后端运行：<code>pnpm dev:backend</code></p>
        </div>
      {:else if loading}
        <div class="card muted-center"><Icon name="loader-2" size={14} class="spin" /> 加载中…</div>
      {:else if activeTab === 'module' && moduleDetail}
        <!-- 模块详情 -->
        <div class="card module-header">
          <div class="module-title">
            <span class="pill pill-info">{moduleDetail.moduleType}</span>
            <code class="module-id">{selectedKey}</code>
            <h2>{moduleDetail.moduleName}</h2>
          </div>
          <div class="module-meta">
            <span>工厂：<strong>{moduleDetail.factory}</strong></span>
            {#if moduleDetail.material}<span>材料：<strong>{moduleDetail.material}</strong></span>{/if}
            <span>复用：<strong>{moduleDetail.reuseCount}</strong> 个产品</span>
            <span>关联 SKU 销售行：<strong>{moduleDetail.relatedProductsCount}</strong></span>
            <span>总销量：<strong style="color:var(--success);">{moduleDetail.totalSales.toLocaleString()}</strong></span>
          </div>
          <div class="module-brands">
            涉及品牌：
            {#each moduleDetail.brands as b}<span class="pill pill-primary">{b}</span>{/each}
          </div>
        </div>

        {#if moduleDetail.relatedProducts.length > 0}
          <div class="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>品牌</th>
                  <th>品类</th>
                  <th>货品简称</th>
                  <th>名称</th>
                  <th>规格</th>
                  <th>复用位置</th>
                  <th class="num">销量</th>
                  <th>店铺</th>
                </tr>
              </thead>
              <tbody>
                {#each moduleDetail.relatedProducts as p, i (p.code + '|' + p.shop + '|' + p.spec + '|' + i)}
                  <tr>
                    <td><span class="pill pill-primary">{p.brand}</span></td>
                    <td><span class="pill pill-info">{p.category}</span></td>
                    <td><code>{p.product_abbrev}</code></td>
                    <td>{p.name}</td>
                    <td>{p.spec || '—'}</td>
                    <td><span class="pill pill-default">{p.reusePosition || '—'}</span></td>
                    <td class="num" class:sales-hot={p.sales >= 100} class:sales-zero={p.sales === 0}>{p.sales}</td>
                    <td class="muted small">{p.shop}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="card empty">该模块当前没有可关联的 SKU 销售记录</div>
        {/if}
      {:else if activeTab !== 'module' && (selectedKey || activeTab === 'zero')}
        <!-- 普通 SKU 列表 -->
        <div class="result-bar">
          <span>
            {#if activeTab === 'category'}品类「<strong>{selectedKey}</strong>」{/if}
            {#if activeTab === 'brand'}品牌「<strong>{selectedKey}</strong>」{/if}
            {#if activeTab === 'zero'}全部 <strong>0 销量</strong> SKU{/if}
            ：共 <strong>{productsTotal.toLocaleString()}</strong> 个，显示前 <strong>{products.length}</strong> 个
          </span>
        </div>

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
                {#each products as p, i (p.code + '|' + p.shop + '|' + p.spec + '|' + i)}
                  <tr>
                    <td><span class="pill pill-primary">{p.brand}</span></td>
                    <td><span class="pill pill-info">{p.category}</span></td>
                    <td><code>{p.product_abbrev}</code></td>
                    <td>{p.name}</td>
                    <td>{p.spec || '—'}</td>
                    <td class="num" class:sales-hot={p.sales >= 100} class:sales-zero={p.is_zero_sales}>{p.sales}</td>
                    <td class="num">{p.price ? '¥' + p.price : '—'}</td>
                    <td class="num">{p.margin ? p.margin.toFixed(1) + '%' : '—'}</td>
                    <td class="muted small">{p.shop}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="card empty">没有匹配的 SKU</div>
        {/if}
      {:else}
        <div class="card empty"><Icon name="chevron-left" size={14} /> 左侧选一项查看详情</div>
      {/if}
    </section>
  </div>
</div>

<style>
  .query-page h1 {
    font-size: 24px;
    margin-bottom: 4px;
  }
  .sub {
    color: var(--gray-500);
    font-size: 13px;
    margin-bottom: 16px;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }
  .tab {
    background: white;
    padding: 10px 18px;
    border-radius: var(--radius-md);
    font-weight: 500;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    font-size: 14px;
    color: var(--gray-700);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .tab:hover {
    background: var(--gray-100);
  }
  .tab.active {
    border-color: var(--primary);
    color: var(--primary);
  }
  .tab-num {
    background: var(--gray-100);
    padding: 1px 7px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    color: var(--gray-500);
  }
  .tab.active .tab-num {
    background: var(--primary-light);
    color: var(--primary);
  }

  /* Filter bar */
  .filter-bar {
    padding: 12px 16px;
    margin-bottom: 14px;
  }
  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-end;
  }
  .filter-row label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11px;
    color: var(--gray-500);
  }
  .input.narrow {
    width: 90px;
  }
  .input.search {
    flex: 1;
    min-width: 200px;
  }

  /* Main layout */
  .main {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 14px;
  }
  .side {
    background: white;
    border-radius: var(--radius-lg);
    padding: 14px;
    box-shadow: var(--shadow-sm);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
  }
  .side-header h3 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--gray-500);
    margin-bottom: 8px;
  }
  .side-search {
    font-size: 12px;
    margin-bottom: 8px;
    padding: 6px 10px;
  }
  .side-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .side-item {
    background: transparent;
    border: none;
    text-align: left;
    padding: 7px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    color: var(--gray-900);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
  }
  .side-item:hover {
    background: var(--gray-50);
  }
  .side-item.selected {
    background: var(--primary-light);
    color: var(--primary);
    font-weight: 600;
  }
  .side-item-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side-item-num {
    background: var(--gray-100);
    padding: 1px 7px;
    border-radius: 100px;
    font-size: 11px;
    color: var(--gray-500);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }
  .side-item.selected .side-item-num {
    background: white;
    color: var(--primary);
  }
  .side-zero-tip {
    background: #fffbeb;
    color: #92400e;
    padding: 12px;
    border-radius: var(--radius-md);
    font-size: 12px;
    text-align: center;
    line-height: 1.6;
  }
  .muted {
    color: var(--gray-400);
    padding: 12px;
    font-size: 13px;
    text-align: center;
  }

  /* Right content */
  .content {
    min-height: 0;
  }
  .result-bar {
    padding: 8px 14px 4px;
    font-size: 13px;
    color: var(--gray-700);
  }
  .muted-center {
    padding: 60px;
    text-align: center;
    color: var(--gray-400);
  }
  .error {
    color: var(--danger);
    padding: 20px;
  }
  .empty {
    padding: 60px;
    text-align: center;
    color: var(--gray-500);
  }

  /* Module header */
  .module-header {
    padding: 16px 20px;
    margin-bottom: 12px;
  }
  .module-title {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .module-title h2 {
    font-size: 18px;
    margin: 0;
  }
  .module-id {
    background: var(--gray-100);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    color: var(--gray-700);
  }
  .module-meta {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    font-size: 13px;
    color: var(--gray-700);
    margin-bottom: 8px;
  }
  .module-brands {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
    color: var(--gray-500);
  }

  /* Table */
  .table-wrap {
    padding: 0;
    overflow: auto;
    max-height: 60vh;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  thead th {
    background: var(--gray-100);
    padding: 9px 12px;
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
    padding: 8px 12px;
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
</style>
