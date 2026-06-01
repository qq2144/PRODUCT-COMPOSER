<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import type { Overview } from '../lib/types';

  let overview = $state<Overview | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      overview = await api.overview();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="cockpit">
  <div class="hero">
    <h1>🚀 产品组合器 · 驾驶舱</h1>
    <p>用真数据驱动产品决策。所有数字直接来自销量表、工厂模块库和货盘。</p>
  </div>

  {#if loading}
    <div class="loading card">加载中...</div>
  {:else if error}
    <div class="error card">
      <strong>❌ 加载失败：</strong> {error}
      <p>请确认后端已启动：<code>pnpm dev:backend</code></p>
    </div>
  {:else if overview}
    <div class="metrics">
      <div class="metric">
        <div class="num">{overview.totalSkus.toLocaleString()}</div>
        <div class="label">总 SKU</div>
      </div>
      <div class="metric">
        <div class="num">{overview.totalModules}</div>
        <div class="label">模块</div>
      </div>
      <div class="metric">
        <div class="num">{overview.totalCategories}</div>
        <div class="label">品类</div>
      </div>
      <div class="metric">
        <div class="num">{overview.totalBrands}</div>
        <div class="label">品牌</div>
      </div>
      <div class="metric">
        <div class="num">{overview.totalLinks}</div>
        <div class="label">模块↔SKU 关联</div>
      </div>
      <div class="metric danger">
        <div class="num">{overview.zeroSalesSkus}</div>
        <div class="label">0 销量 SKU</div>
      </div>
    </div>

    <div class="row-2">
      <div class="card">
        <h3>📦 品类分布 TOP 10</h3>
        <table class="rank">
          <tbody>
            {#each overview.categoriesTop.slice(0, 10) as cat, i (cat.name)}
              <tr>
                <td class="idx">{i + 1}</td>
                <td>{cat.name}</td>
                <td class="num">{cat.count}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>🏷️ 品牌分布</h3>
        <table class="rank">
          <tbody>
            {#each overview.brandsTop as brand, i (brand.name)}
              <tr>
                <td class="idx">{i + 1}</td>
                <td>{brand.name}</td>
                <td class="num">{brand.count}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card meta">
      数据快照时间：<code>{new Date(overview.loadedAt).toLocaleString('zh-CN')}</code>
    </div>
  {/if}
</div>

<style>
  .hero {
    background: var(--gradient);
    color: white;
    border-radius: var(--radius-xl);
    padding: 32px 40px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-lg);
  }
  .hero h1 {
    font-size: 28px;
    margin-bottom: 8px;
  }
  .hero p {
    opacity: 0.92;
    font-size: 15px;
  }
  .loading,
  .error {
    padding: 40px;
    text-align: center;
    color: var(--gray-500);
  }
  .error {
    color: var(--danger);
    text-align: left;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  .metric {
    background: white;
    border-radius: var(--radius-lg);
    padding: 18px 22px;
    box-shadow: var(--shadow-sm);
  }
  .metric .num {
    font-size: 28px;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-mono);
  }
  .metric.danger .num {
    color: var(--danger);
  }
  .metric .label {
    font-size: 11px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .card h3 {
    font-size: 15px;
    margin-bottom: 12px;
  }
  .rank {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .rank td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--gray-100);
  }
  .rank .idx {
    color: var(--gray-400);
    font-family: var(--font-mono);
    width: 30px;
  }
  .rank .num {
    text-align: right;
    color: var(--primary);
    font-weight: 600;
    font-family: var(--font-mono);
  }
  .meta {
    text-align: center;
    color: var(--gray-500);
    font-size: 12px;
  }
</style>
