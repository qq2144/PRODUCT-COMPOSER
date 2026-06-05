<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { api } from '../lib/api';
  import Icon from '../lib/Icon.svelte';
  import type { CategoryMapResult, MatrixCell } from '../lib/types';

  let result = $state<CategoryMapResult | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let minCategorySize = $state(30);

  async function load() {
    loading = true;
    error = null;
    try {
      result = await api.categoryMap(minCategorySize);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function cellClass(cell: MatrixCell): string {
    if (cell.isGap) return 'cell-gap';
    if (cell.skuRowCount >= 200) return 'cell-strong';
    if (cell.skuRowCount >= 50) return 'cell-medium';
    return 'cell-weak';
  }

  function handleCellClick(cell: MatrixCell) {
    if (cell.isGap) {
      // 跳转到组合器，预填品牌迁移提示
      const text = `做一个 ${cell.brand} 品牌的 ${cell.category}（参考同品类已有产品做品牌迁移）`;
      navigate(`/compose?text=${encodeURIComponent(text)}`);
    }
  }

  onMount(load);
</script>

<div class="cm-page">
  <h1><Icon name="map" size={20} /> 品类地图缺失</h1>
  <p class="sub">品牌 × 品类矩阵 — 红格 = 该品牌在该品类没有产品 = 潜在开拓机会</p>

  <!-- 控制条 -->
  <div class="card controls">
    <label class="ctrl">
      <span>仅显示 SKU 数 ≥</span>
      <input
        class="input narrow"
        type="number"
        min="0"
        bind:value={minCategorySize}
        onchange={load}
      />
      <span class="muted">的品类</span>
    </label>
    {#if result}
      <div class="stats">
        <span><strong>{result.categories.length}</strong> 品类</span>
        <span><strong>{result.brands.length}</strong> 品牌</span>
        <span class="gap-count"><strong>{result.gapsCount}</strong> 缺口</span>
        <span class="filled-count"><strong>{result.filledCount}</strong> 已填</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="card muted-center"><Icon name="loader-2" size={14} class="spin" /> 加载中…</div>
  {:else if error}
    <div class="card err"><Icon name="alert-circle" size={14} /> {error}</div>
  {:else if result}
    <!-- 图例 -->
    <div class="legend">
      <span class="leg cell-strong">≥200 SKU 主力</span>
      <span class="leg cell-medium">50-199 中等</span>
      <span class="leg cell-weak">&lt;50 少量</span>
      <span class="leg cell-gap"><Icon name="x" size={11} /> 缺口 - 点击进组合器</span>
    </div>

    <!-- 矩阵 -->
    <div class="matrix-wrap card">
      <table class="matrix">
        <thead>
          <tr>
            <th class="cat-col">品类 \ 品牌</th>
            {#each result.brands as brand (brand)}
              <th class="brand-col">
                {brand}
                <span class="brand-total">{result.brandCategoryTotals[brand] ?? 0}</span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each result.categories as cat, ri (cat)}
            <tr>
              <td class="cat-col">
                <span class="cat-name">{cat}</span>
                <span class="cat-total">{result.categorySkuTotals[cat] ?? 0} SKU</span>
              </td>
              {#each result.matrix[ri]! as cell (cat + '|' + cell.brand)}
                <td
                  class="cell {cellClass(cell)}"
                  class:clickable={cell.isGap}
                  onclick={() => handleCellClick(cell)}
                  title={cell.isGap
                    ? `${cell.brand} 在 ${cell.category} 缺口 — 点击进组合器做品牌迁移`
                    : `${cell.skuRowCount} SKU销售行 · 销量 ${cell.totalSales}`}
                >
                  {#if cell.isGap}
                    <span class="gap-icon"><Icon name="x" size={14} /></span>
                  {:else}
                    <div class="cell-num">{cell.skuRowCount}</div>
                    <div class="cell-sales">{cell.totalSales.toLocaleString()}</div>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="card hint">
      <Icon name="info" size={15} /> <strong>使用建议</strong>：
      点击任一红色缺口格子 → 跳转「组合器」并自动填入品牌迁移提示词 → 系统会基于同品类已有 SKU 提供模块参考。
      数字格子 = 该品牌在该品类的 SKU 销售行数 / 累计销量。
    </div>
  {/if}
</div>

<style>
  .cm-page h1 { font-size: 24px; margin-bottom: 4px; }
  .sub { color: var(--gray-500); font-size: 13px; margin-bottom: 16px; }

  .controls {
    padding: 14px 18px;
    margin-bottom: 14px;
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
  }
  .ctrl {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .ctrl .muted { color: var(--gray-500); }
  .input.narrow { width: 80px; }
  .stats {
    margin-left: auto;
    display: flex;
    gap: 18px;
    font-size: 13px;
    color: var(--gray-700);
  }
  .stats strong {
    font-family: var(--font-mono);
    color: var(--gray-900);
  }
  .gap-count strong { color: var(--danger); }
  .filled-count strong { color: var(--success); }

  .err {
    color: var(--danger);
    padding: 16px;
    text-align: center;
  }
  .muted-center {
    padding: 40px;
    text-align: center;
    color: var(--gray-400);
  }

  .legend {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .leg {
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    font-weight: 500;
  }

  .matrix-wrap {
    padding: 0;
    overflow: auto;
    max-height: 70vh;
  }
  .matrix {
    border-collapse: separate;
    border-spacing: 3px;
    background: white;
    padding: 6px;
    font-size: 12px;
  }
  .matrix th {
    background: var(--gray-100);
    padding: 8px 10px;
    text-align: center;
    font-weight: 600;
    color: var(--gray-700);
    border-radius: var(--radius-sm);
    position: sticky;
    top: 0;
    z-index: 2;
  }
  .matrix th.cat-col {
    text-align: left;
    background: var(--gray-200);
    position: sticky;
    left: 0;
    z-index: 3;
    min-width: 110px;
  }
  .brand-col { min-width: 90px; }
  .brand-total {
    display: block;
    font-size: 10px;
    color: var(--gray-500);
    font-weight: 400;
    font-family: var(--font-mono);
  }

  .matrix td.cat-col {
    background: var(--gray-100);
    text-align: left;
    padding: 8px 10px;
    position: sticky;
    left: 0;
    z-index: 1;
    border-radius: var(--radius-sm);
  }
  .cat-name {
    font-weight: 600;
    color: var(--gray-900);
  }
  .cat-total {
    display: block;
    font-size: 10px;
    color: var(--gray-500);
    margin-top: 2px;
    font-family: var(--font-mono);
  }

  .cell {
    padding: 10px 6px;
    border-radius: var(--radius-sm);
    text-align: center;
    font-family: var(--font-mono);
    min-width: 80px;
  }
  .cell-num {
    font-size: 14px;
    font-weight: 700;
  }
  .cell-sales {
    font-size: 10px;
    color: rgba(0, 0, 0, 0.5);
    margin-top: 2px;
  }

  .cell-strong { background: #16a34a; color: white; }
  .cell-medium { background: #86efac; color: #14532d; }
  .cell-weak   { background: #dcfce7; color: #166534; }
  .cell-gap {
    background: #fee2e2;
    border: 1.5px dashed #ef4444;
    color: #991b1b;
  }
  .cell.clickable {
    cursor: pointer;
    transition: all 0.15s;
  }
  .cell.clickable:hover {
    background: #fca5a5;
    color: white;
    transform: scale(1.05);
  }
  .gap-icon { font-size: 18px; }

  .hint {
    margin-top: 14px;
    padding: 12px 16px;
    background: #f0f9ff;
    border-left: 3px solid var(--info);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    font-size: 13px;
    color: #0c4a6e;
    box-shadow: none;
  }
</style>
