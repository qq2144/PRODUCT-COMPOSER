<script lang="ts">
  import { onMount } from 'svelte';
  import { Link } from 'svelte-routing';
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

    <!-- M5：本月活动 -->
    <div class="activity-row">
      <div class="activity">
        <div class="a-emoji">🆕</div>
        <div class="a-body">
          <div class="a-num">{overview.newModulesThisMonth}</div>
          <div class="a-label">本月新增模块</div>
        </div>
      </div>
      <Link to="/concepts" class="activity activity-link">
        <div class="a-emoji">📋</div>
        <div class="a-body">
          <div class="a-num">{overview.newCardsThisMonth}</div>
          <div class="a-label">本月新增概念卡 →</div>
        </div>
      </Link>
      <Link to="/underperform" class="activity activity-link activity-warn">
        <div class="a-emoji">⚠️</div>
        <div class="a-body">
          <div class="a-num">{overview.zeroSalesSkus}</div>
          <div class="a-label">未起量 SKU 待诊断 →</div>
        </div>
      </Link>
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

    <!-- M5：模块引用 TOP 5 -->
    <div class="card">
      <h3>🧩 模块引用 TOP 5 <span class="muted small">— 哪些模块被组合最多</span></h3>
      {#if overview.moduleReuseTop.length === 0}
        <div class="empty-mini">暂无</div>
      {:else}
        <table class="rank">
          <tbody>
            {#each overview.moduleReuseTop as m, i (m.moduleId)}
              <tr>
                <td class="idx">{i + 1}</td>
                <td><code>{m.moduleId}</code></td>
                <td>{m.moduleName}</td>
                <td class="num">{m.reuseCount}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
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
  /* M5：本月活动行 */
  .activity-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  .activity {
    background: white;
    border-radius: var(--radius-lg);
    padding: 16px 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--gray-900);
    text-decoration: none;
  }
  :global(.activity-link:hover) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    transition: all 0.15s;
  }
  .a-emoji { font-size: 28px; }
  .a-num {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-mono);
    line-height: 1.1;
  }
  :global(.activity-warn .a-num) { color: var(--danger); }
  .a-label {
    font-size: 11px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }
  .muted.small { color: var(--gray-400); font-size: 11px; font-weight: 400; margin-left: 6px; }
  .empty-mini { color: var(--gray-400); font-size: 12px; padding: 12px; text-align: center; }
  .rank code { color: var(--primary); font-size: 11px; }
</style>
