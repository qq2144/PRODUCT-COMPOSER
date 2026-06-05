<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Icon from '../lib/Icon.svelte';
  import type { UnderperformItem, SkuDiagnosis, Overview } from '../lib/types';

  let overview = $state<Overview | null>(null);

  // 列表
  let items = $state<UnderperformItem[]>([]);
  let total = $state(0);
  let listLoading = $state(false);

  // 筛选
  let filterCategory = $state('');
  let filterBrand = $state('');
  let salesMax = $state(0);

  // 选中 + 诊断
  let selected = $state<UnderperformItem | null>(null);
  let diagnosis = $state<SkuDiagnosis | null>(null);
  let diagLoading = $state(false);

  let error = $state<string | null>(null);

  async function fetchList() {
    listLoading = true;
    error = null;
    try {
      const r = await api.underperform({
        category: filterCategory || undefined,
        brand: filterBrand || undefined,
        salesMax,
        limit: 100,
      });
      items = r.items;
      total = r.total;
      // 自动选中第一个
      if (items.length > 0 && !selected) {
        select(items[0]!);
      } else if (items.length === 0) {
        selected = null;
        diagnosis = null;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      listLoading = false;
    }
  }

  async function select(item: UnderperformItem) {
    selected = item;
    diagnosis = null;
    diagLoading = true;
    try {
      diagnosis = await api.diagnoseSku(item.productAbbrev);
    } catch (e) {
      diagnosis = null;
    } finally {
      diagLoading = false;
    }
  }

  function pricePosColor(p: 'above' | 'below' | 'equal'): string {
    if (p === 'above') return 'pos-above';
    if (p === 'below') return 'pos-below';
    return 'pos-equal';
  }

  onMount(async () => {
    try {
      overview = await api.overview();
    } catch {
      // 不影响主流程
    }
    await fetchList();
  });
</script>

<div class="uf-page">
  <h1><Icon name="alert-triangle" size={20} /> 未起量诊断</h1>
  <p class="sub">销量低/为 0 的 SKU 列表 + 同品类客观数据对比（不评判，给数据让你看）</p>

  <!-- 筛选条 -->
  <div class="card filter">
    <label>
      <span>品类</span>
      <select class="input" bind:value={filterCategory} onchange={fetchList}>
        <option value="">全部</option>
        {#if overview}
          {#each overview.categoriesTop as c (c.name)}
            <option value={c.name}>{c.name} ({c.count})</option>
          {/each}
        {/if}
      </select>
    </label>
    <label>
      <span>品牌</span>
      <select class="input" bind:value={filterBrand} onchange={fetchList}>
        <option value="">全部</option>
        {#if overview}
          {#each overview.brandsTop as b (b.name)}
            <option value={b.name}>{b.name} ({b.count})</option>
          {/each}
        {/if}
      </select>
    </label>
    <label>
      <span>销量 ≤</span>
      <input
        class="input narrow"
        type="number"
        min="0"
        bind:value={salesMax}
        onchange={fetchList}
      />
    </label>
    <span class="result-info">共 <strong>{total.toLocaleString()}</strong> 个 SKU 命中筛选</span>
  </div>

  {#if error}
    <div class="card err"><Icon name="alert-circle" size={14} /> {error}</div>
  {/if}

  <div class="main">
    <!-- 左侧列表 -->
    <aside class="side">
      <div class="side-header">未起量 SKU（按品类百分位升序）</div>
      <div class="side-list">
        {#if listLoading}
          <div class="muted-center"><Icon name="loader-2" size={14} class="spin" /> 加载中…</div>
        {:else if items.length === 0}
          <div class="muted-center">没有匹配的 SKU</div>
        {:else}
          {#each items as it (it.productAbbrev + '|' + it.brand + '|' + it.spec)}
            <button
              class="side-item"
              class:selected={selected?.productAbbrev === it.productAbbrev &&
                selected?.brand === it.brand &&
                selected?.spec === it.spec}
              onclick={() => select(it)}
              type="button"
            >
              <div class="si-head">
                <span class="pill pill-primary">{it.brand}</span>
                <span class="pill pill-info">{it.category}</span>
              </div>
              <div class="si-name">
                <code>{it.productAbbrev}</code> {it.name}
              </div>
              <div class="si-meta">
                <span class="sales-bad">销 {it.sales}</span>
                {#if it.price > 0}
                  <span>¥{it.price}</span>
                {/if}
                {#if it.spec}
                  <span class="muted">{it.spec}</span>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </aside>

    <!-- 右侧诊断 -->
    <section class="content">
      {#if diagLoading}
        <div class="card muted-center"><Icon name="loader-2" size={14} class="spin" /> 诊断中…</div>
      {:else if diagnosis}
        <!-- 目标信息 -->
        <div class="card target-head">
          <div class="th-row">
            <span class="pill pill-primary">{diagnosis.target.brand}</span>
            <code class="th-code">{diagnosis.target.productAbbrev}</code>
            <h2>{diagnosis.target.name}</h2>
            <span class="th-cat">{diagnosis.target.category}</span>
          </div>
          <div class="th-meta">
            目标总销量 <strong class="sales-bad">{diagnosis.target.totalSales}</strong>
            · 同品类共 <strong>{diagnosis.categoryStats.skuCount}</strong> 个独立产品
          </div>
        </div>

        <!-- 同品类对比卡 -->
        <div class="row-2">
          <!-- 销量对比 -->
          <div class="card stat-card">
            <div class="sc-title">同品类销量分布</div>
            <div class="dist-row">
              <span>P25</span><strong>{diagnosis.categoryStats.salesDistribution.p25}</strong>
            </div>
            <div class="dist-row median">
              <span>P50 中位</span>
              <strong>{diagnosis.categoryStats.salesDistribution.p50}</strong>
            </div>
            <div class="dist-row">
              <span>P75</span><strong>{diagnosis.categoryStats.salesDistribution.p75}</strong>
            </div>
            <div class="dist-row">
              <span>P90</span><strong>{diagnosis.categoryStats.salesDistribution.p90}</strong>
            </div>
            <div class="dist-row top">
              <span>顶部</span><strong>{diagnosis.categoryStats.salesDistribution.max}</strong>
            </div>
            <div class="gap-info">
              本品 vs 中位差距：
              <strong class="sales-bad">{diagnosis.categoryStats.targetVsMedian.salesGap}</strong>
            </div>
          </div>

          <!-- 价格对比 -->
          <div class="card stat-card">
            <div class="sc-title">同品类价格分布</div>
            <div class="dist-row">
              <span>P25</span><strong>¥{diagnosis.categoryStats.priceDistribution.p25}</strong>
            </div>
            <div class="dist-row median">
              <span>P50 中位</span>
              <strong>¥{diagnosis.categoryStats.priceDistribution.p50}</strong>
            </div>
            <div class="dist-row">
              <span>P75</span><strong>¥{diagnosis.categoryStats.priceDistribution.p75}</strong>
            </div>
            <div class="dist-row">
              <span>均价</span><strong>¥{diagnosis.categoryStats.priceDistribution.avg}</strong>
            </div>
            <div class="gap-info {pricePosColor(diagnosis.categoryStats.targetVsMedian.pricePosition)}">
              本品价位：
              {#if diagnosis.categoryStats.targetVsMedian.pricePosition === 'above'}
                ⬆ 高于中位 {diagnosis.categoryStats.targetVsMedian.priceGapPct}%
              {:else if diagnosis.categoryStats.targetVsMedian.pricePosition === 'below'}
                ⬇ 低于中位 {Math.abs(diagnosis.categoryStats.targetVsMedian.priceGapPct)}%
              {:else}
                ≈ 与中位接近
              {/if}
            </div>
          </div>
        </div>

        <!-- 同品类爆品对照 -->
        {#if diagnosis.benchmarks.length > 0}
          <div class="card section">
            <div class="section-title"><Icon name="trophy" size={15} /> 同品类销量 TOP {diagnosis.benchmarks.length}（参照）</div>
            <table class="bench-table">
              <thead>
                <tr>
                  <th>品牌</th>
                  <th>货号</th>
                  <th>名称</th>
                  <th class="num">总销量</th>
                  <th class="num">均价</th>
                </tr>
              </thead>
              <tbody>
                {#each diagnosis.benchmarks as b (b.productAbbrev)}
                  <tr>
                    <td><span class="pill pill-primary">{b.brand}</span></td>
                    <td><code>{b.productAbbrev}</code></td>
                    <td>{b.name}</td>
                    <td class="num sales-good">{b.totalSales.toLocaleString()}</td>
                    <td class="num">{b.avgPrice ? '¥' + b.avgPrice : '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- 本品所有规格销售明细 -->
        <div class="card section">
          <div class="section-title"><Icon name="package" size={15} /> 本品所有规格销售明细（{diagnosis.target.specs.length} 行）</div>
          <table class="spec-table">
            <thead>
              <tr>
                <th>规格</th>
                <th>店铺</th>
                <th class="num">销量</th>
                <th class="num">售价</th>
                <th class="num">毛利%</th>
              </tr>
            </thead>
            <tbody>
              {#each diagnosis.target.specs as s, i (i + s.shop + s.spec)}
                <tr>
                  <td>{s.spec || '—'}</td>
                  <td class="muted small">{s.shop}</td>
                  <td class="num" class:sales-bad={s.sales <= 0}>{s.sales}</td>
                  <td class="num">{s.price ? '¥' + s.price : '—'}</td>
                  <td class="num">{s.margin ? s.margin.toFixed(1) + '%' : '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- 决策提示（不评判，给方向） -->
        <div class="card decision-hint">
          <Icon name="target" size={15} /> <strong>你可以从下面几个方向自行判断</strong>：
          <ul>
            <li>价格是否合理（看本品价位 vs 中位）</li>
            <li>是否是渠道问题（看店铺销量分布）</li>
            <li>是否产品定义有问题（对比同品类 TOP）</li>
            <li>是否值得迭代（参考组合器做品牌迁移/外观升级）</li>
          </ul>
          <p class="hint-tail muted">系统只摆数据，要不要做、做什么改，由你决定。</p>
        </div>
      {:else}
        <div class="card muted-center"><Icon name="chevron-left" size={14} /> 左侧选一个 SKU 查看诊断数据</div>
      {/if}
    </section>
  </div>
</div>

<style>
  .uf-page h1 { font-size: 24px; margin-bottom: 4px; }
  .sub { color: var(--gray-500); font-size: 13px; margin-bottom: 16px; }

  .filter {
    padding: 12px 16px;
    margin-bottom: 14px;
    display: flex;
    gap: 14px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .filter label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11px;
    color: var(--gray-500);
  }
  .input.narrow { width: 90px; }
  .result-info {
    margin-left: auto;
    font-size: 13px;
    color: var(--gray-700);
  }
  .result-info strong { font-family: var(--font-mono); color: var(--primary); }

  .err {
    color: var(--danger);
    padding: 14px;
  }

  .main {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 14px;
  }
  .side {
    background: white;
    border-radius: var(--radius-lg);
    padding: 12px;
    box-shadow: var(--shadow-sm);
    max-height: 75vh;
    display: flex;
    flex-direction: column;
  }
  .side-header {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--gray-500);
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--gray-200);
  }
  .side-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .muted-center {
    padding: 30px;
    text-align: center;
    color: var(--gray-400);
    font-size: 13px;
  }
  .side-item {
    background: var(--gray-50);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    padding: 10px 12px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    color: var(--gray-900);
  }
  .side-item:hover { background: var(--gray-100); }
  .side-item.selected {
    border-color: var(--primary);
    background: var(--primary-light);
  }
  .si-head {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
  }
  .si-name {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .si-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--gray-500);
  }
  .sales-bad { color: var(--danger); font-weight: 700; }
  .sales-good { color: var(--success); font-weight: 700; }

  /* Content */
  .content { min-width: 0; }

  .target-head {
    padding: 16px 20px;
    margin-bottom: 12px;
  }
  .th-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .th-row h2 { font-size: 18px; margin: 0; }
  .th-code {
    background: var(--gray-100);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    color: var(--gray-700);
  }
  .th-cat {
    margin-left: auto;
    color: var(--gray-500);
    font-size: 13px;
  }
  .th-meta {
    font-size: 13px;
    color: var(--gray-700);
  }
  .th-meta strong { font-family: var(--font-mono); }

  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .stat-card { padding: 16px 18px; }
  .sc-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--gray-700);
    margin-bottom: 10px;
  }
  .dist-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
    border-bottom: 1px dashed var(--gray-100);
  }
  .dist-row span { color: var(--gray-500); }
  .dist-row strong { font-family: var(--font-mono); color: var(--gray-900); }
  .dist-row.median {
    background: var(--primary-light);
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    border-bottom: none;
  }
  .dist-row.median span,
  .dist-row.median strong { color: var(--primary); }
  .dist-row.top {
    background: #fef3c7;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    border-bottom: none;
  }
  .dist-row.top span,
  .dist-row.top strong { color: #92400e; }
  .gap-info {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--gray-200);
    font-size: 13px;
    color: var(--gray-700);
  }
  .gap-info strong { font-family: var(--font-mono); }

  .section { margin-bottom: 12px; }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .bench-table,
  .spec-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .bench-table th,
  .spec-table th {
    background: var(--gray-100);
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    color: var(--gray-700);
    font-size: 11px;
  }
  .bench-table td,
  .spec-table td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--gray-100);
  }
  td.num, th.num { text-align: right; font-family: var(--font-mono); }
  td.muted { color: var(--gray-500); }
  td.small { font-size: 11px; }

  .decision-hint {
    background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
    padding: 14px 18px;
    font-size: 13px;
    color: #0c4a6e;
  }
  .decision-hint ul {
    margin: 8px 0 8px 18px;
    line-height: 1.8;
  }
  .hint-tail {
    margin-top: 6px;
    font-size: 12px;
  }
</style>
