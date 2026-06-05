<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { api } from '../lib/api';
  import Icon from '../lib/Icon.svelte';
  import type { Overview } from '../lib/types';

  function go(path: string) {
    return (e: MouseEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(path);
    };
  }

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

  const METRICS = [
    { key: 'totalSkus',       icon: 'package',      label: '总 SKU' },
    { key: 'totalModules',    icon: 'puzzle',       label: '模块' },
    { key: 'totalCategories', icon: 'boxes',        label: '品类' },
    { key: 'totalBrands',     icon: 'tag',          label: '品牌' },
    { key: 'totalLinks',      icon: 'link-2',       label: '模块↔SKU 关联' },
    { key: 'zeroSalesSkus',   icon: 'minus-circle', label: '0 销量 SKU', danger: true },
  ] as const;
</script>

<div class="cockpit">
  <div class="hero">
    <h1>
      <span class="hero-icon"><Icon name="rocket" size={28} /></span>
      产品组合器 · 驾驶舱
    </h1>
    <p>用真数据驱动产品决策。所有数字直接来自销量表、工厂模块库和货盘。</p>
  </div>

  {#if loading}
    <div class="loading card">
      <Icon name="loader-2" size={18} class="spin" /> 加载中…
    </div>
  {:else if error}
    <div class="error card">
      <div class="err-head"><Icon name="alert-circle" size={18} /> <strong>加载失败：</strong> {error}</div>
      <p>请确认后端已启动：<code>pnpm dev:backend</code></p>
    </div>
  {:else if overview}
    <div class="metrics">
      {#each METRICS as m (m.key)}
        <div class="metric" class:danger={'danger' in m && m.danger}>
          <div class="m-head">
            <span class="m-icon"><Icon name={m.icon} size={16} /></span>
            <div class="label">{m.label}</div>
          </div>
          <div class="num">{(overview[m.key as keyof Overview] as number).toLocaleString()}</div>
        </div>
      {/each}
    </div>

    <!-- 本月活动 -->
    <div class="activity-row">
      <div class="activity">
        <div class="a-icon"><Icon name="badge-plus" size={22} /></div>
        <div class="a-body">
          <div class="a-num">{overview.newModulesThisMonth}</div>
          <div class="a-label">本月新增模块</div>
        </div>
      </div>
      <a class="activity activity-link" href="/concepts" onclick={go('/concepts')}>
        <div class="a-icon"><Icon name="clipboard-list" size={22} /></div>
        <div class="a-body">
          <div class="a-num">{overview.newCardsThisMonth}</div>
          <div class="a-label">本月新增概念卡 <Icon name="arrow-right" size={11} /></div>
        </div>
      </a>
      <a class="activity activity-link activity-warn" href="/underperform" onclick={go('/underperform')}>
        <div class="a-icon"><Icon name="alert-triangle" size={22} /></div>
        <div class="a-body">
          <div class="a-num">{overview.zeroSalesSkus}</div>
          <div class="a-label">未起量 SKU 待诊断 <Icon name="arrow-right" size={11} /></div>
        </div>
      </a>
    </div>

    <div class="row-2">
      <div class="card">
        <h3><Icon name="boxes" size={16} /> 品类分布 TOP 10</h3>
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
        <h3><Icon name="tag" size={16} /> 品牌分布</h3>
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

    <!-- 模块引用 TOP 5 -->
    <div class="card">
      <h3>
        <Icon name="puzzle" size={16} /> 模块引用 TOP 5
        <span class="muted small">— 哪些模块被组合最多</span>
      </h3>
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
    font-size: 26px;
    margin-bottom: 8px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .hero-icon {
    display: inline-flex;
    align-items: center;
    background: rgba(255,255,255,0.18);
    border-radius: var(--radius-md);
    padding: 6px;
  }
  .hero p {
    opacity: 0.92;
    font-size: 14px;
  }
  .loading,
  .error {
    padding: 32px;
    text-align: center;
    color: var(--gray-500);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .error {
    color: var(--danger);
    text-align: left;
    flex-direction: column;
    align-items: stretch;
  }
  .err-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .metric {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 14px 18px;
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--t-fast), border-color var(--t-fast);
  }
  .metric:hover { box-shadow: var(--shadow-md); }
  .m-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; color: var(--gray-500); }
  .m-icon { display: inline-flex; }
  .metric .num {
    font-size: 26px;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-mono);
    line-height: 1.1;
  }
  .metric.danger .num { color: var(--danger); }
  .metric.danger .m-icon { color: var(--danger); }
  .metric .label {
    font-size: 11px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .card h3 {
    font-size: 14px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--gray-900);
  }
  .card h3 :global(svg) { color: var(--primary); }
  .rank {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .rank td {
    padding: 7px 8px;
    border-bottom: 1px solid var(--gray-100);
  }
  .rank tr:last-child td { border-bottom: 0; }
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

  /* 本月活动行 */
  .activity-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  .activity {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--gray-900);
    text-decoration: none;
    transition: transform var(--t-fast), box-shadow var(--t-fast), border-color var(--t-fast);
  }
  .activity-link:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-light);
  }
  .a-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--primary-light);
    color: var(--primary);
  }
  .activity-warn .a-icon { background: #fef3c7; color: var(--warning); }
  .a-num {
    font-size: 22px;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-mono);
    line-height: 1.1;
  }
  .activity-warn .a-num { color: var(--danger); }
  .a-label {
    font-size: 11px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .muted.small { color: var(--gray-400); font-size: 11px; font-weight: 400; margin-left: 6px; }
  .empty-mini { color: var(--gray-400); font-size: 12px; padding: 12px; text-align: center; }
  .rank code { color: var(--primary); font-size: 11px; }
</style>
