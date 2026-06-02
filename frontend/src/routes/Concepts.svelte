<script lang="ts">
  import { onMount } from 'svelte';
  import { Link } from 'svelte-routing';
  import { api } from '../lib/api';
  import type {
    ConceptCardSummary,
    ConceptCardSaved,
    ConceptCardStatus,
    QuadrantLabel,
  } from '../lib/types';

  let items = $state<ConceptCardSummary[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // 过滤条件（仅前端筛选，先保留简单实现）
  let q = $state('');
  let quadrantFilter = $state<QuadrantLabel>('');
  let statusFilter = $state<ConceptCardStatus | ''>('');

  // 展开看详情
  let expandedId = $state<string | null>(null);
  let expandedCard = $state<ConceptCardSaved | null>(null);
  let expandedLoading = $state(false);

  async function refresh() {
    loading = true;
    error = null;
    try {
      const res = await api.listCards({
        q: q.trim() || undefined,
        quadrant: quadrantFilter || undefined,
        status: statusFilter || undefined,
      });
      items = res.items;
      total = res.total;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  onMount(refresh);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      expandedId = null;
      expandedCard = null;
      return;
    }
    expandedId = id;
    expandedCard = null;
    expandedLoading = true;
    try {
      expandedCard = await api.getCard(id);
    } catch (e) {
      console.error('加载详情失败', e);
    } finally {
      expandedLoading = false;
    }
  }

  async function changeStatus(card: ConceptCardSummary, next: ConceptCardStatus) {
    try {
      await api.updateCard(card.id, { status: next });
      await refresh();
      if (expandedId === card.id) {
        expandedCard = await api.getCard(card.id);
      }
    } catch (e) {
      alert('更新失败：' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function deleteCard(card: ConceptCardSummary) {
    if (!confirm(`确定删除「${card.name}」？此操作不可恢复。`)) return;
    try {
      await api.deleteCard(card.id);
      if (expandedId === card.id) {
        expandedId = null;
        expandedCard = null;
      }
      await refresh();
    } catch (e) {
      alert('删除失败：' + (e instanceof Error ? e.message : String(e)));
    }
  }

  function quadrantLabel(q: string): string {
    return ({ star: '🌟 明星', potential: '⭐ 潜力', redsea: '🌊 红海', chicken: '❌ 鸡肋' } as Record<string, string>)[q] ?? '未选';
  }
  function statusLabel(s: string): string {
    return ({ draft: '草案', discussion: '讨论中', sample: '已打样', archived: '归档' } as Record<string, string>)[s] ?? s;
  }
  function fmtDate(iso: string): string {
    try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }); } catch { return iso; }
  }
</script>

<div class="concepts-page">
  <div class="page-header">
    <div>
      <h1>📋 概念卡库</h1>
      <p class="sub">由组合器沉淀，按状态推进到讨论 / 打样 / 归档</p>
    </div>
    <Link to="/compose" class="btn btn-primary new-btn">+ 去组合器写新草案</Link>
  </div>

  <div class="filters card">
    <input
      type="text"
      class="filter-search"
      placeholder="搜索 名字/摘要/原始想法..."
      bind:value={q}
      oninput={refresh}
    />
    <select bind:value={quadrantFilter} onchange={refresh}>
      <option value="">所有象限</option>
      <option value="star">🌟 明星</option>
      <option value="potential">⭐ 潜力</option>
      <option value="redsea">🌊 红海</option>
      <option value="chicken">❌ 鸡肋</option>
    </select>
    <select bind:value={statusFilter} onchange={refresh}>
      <option value="">所有状态</option>
      <option value="draft">草案</option>
      <option value="discussion">讨论中</option>
      <option value="sample">已打样</option>
      <option value="archived">归档</option>
    </select>
    <span class="count">共 <strong>{total}</strong> 张</span>
  </div>

  {#if loading}
    <div class="card empty">加载中...</div>
  {:else if error}
    <div class="card empty error">❌ {error}</div>
  {:else if items.length === 0}
    <div class="card empty">
      <div class="empty-emoji">📭</div>
      <div>还没有概念卡。去 <Link to="/compose">组合器</Link> 写第一张草案。</div>
    </div>
  {:else}
    <div class="grid">
      {#each items as card (card.id)}
        <div class="card concept-card" class:expanded={expandedId === card.id}>
          <div
            class="card-head"
            onclick={() => toggleExpand(card.id)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(card.id); } }}
            role="button"
            tabindex="0"
          >
            <div class="title-row">
              <h3 class="name">{card.name}</h3>
              <div class="badges">
                {#if card.userQuadrant}<span class="pill pill-q-{card.userQuadrant}">{quadrantLabel(card.userQuadrant)}</span>{/if}
                <span class="pill pill-status-{card.status}">{statusLabel(card.status)}</span>
              </div>
            </div>
            <p class="summary">{card.summary}</p>
            <div class="meta-row">
              <span>📦 {card.totalMatchedModules} 模块</span>
              {#if card.parsedCategory}<span>· {card.parsedCategory}</span>{/if}
              {#if card.parsedBrand}<span>· {card.parsedBrand}</span>{/if}
              <span class="meta-tail">· {card.author} · {fmtDate(card.createdAt)}</span>
            </div>
          </div>

          {#if expandedId === card.id}
            <div class="detail">
              {#if expandedLoading}
                <div class="muted">加载详情...</div>
              {:else if expandedCard}
                <div class="detail-section">
                  <div class="d-label">原始输入</div>
                  <div class="raw-text">"{expandedCard.rawText}"</div>
                </div>

                <div class="detail-section">
                  <div class="d-label">解析维度</div>
                  <div class="chips">
                    {#if expandedCard.payload.parsedIntent.category}<span class="chip">品类 {expandedCard.payload.parsedIntent.category}</span>{/if}
                    {#if expandedCard.payload.parsedIntent.brand}<span class="chip">品牌 {expandedCard.payload.parsedIntent.brand}</span>{/if}
                    {#each expandedCard.payload.parsedIntent.userScenes as s}<span class="chip">场景 {s}</span>{/each}
                    {#each expandedCard.payload.parsedIntent.functions as f}<span class="chip">功能 {f}</span>{/each}
                    {#if expandedCard.payload.parsedIntent.style}<span class="chip">风格 {expandedCard.payload.parsedIntent.style}</span>{/if}
                  </div>
                </div>

                {#if expandedCard.payload.assetComparison.topSeller}
                  <div class="detail-section">
                    <div class="d-label">对照爆品</div>
                    <div class="ts-row">
                      🏆 {expandedCard.payload.assetComparison.topSeller.brand}
                      <code>{expandedCard.payload.assetComparison.topSeller.productAbbrev}</code>
                      {expandedCard.payload.assetComparison.topSeller.name}
                      <span class="sales-tag">销量 {expandedCard.payload.assetComparison.topSeller.totalSales.toLocaleString()}</span>
                    </div>
                  </div>
                {/if}

                <div class="detail-section">
                  <div class="d-label">匹配模块（{expandedCard.payload.totalMatchedModules}）</div>
                  {#each Object.entries(expandedCard.payload.matchedModules) as [dim, mods] (dim)}
                    <div class="mod-dim">
                      <span class="pill pill-info">{dim}</span>
                      <span class="muted small">{mods.length} 条</span>
                      <div class="mod-list">
                        {#each mods as m, idx (`${dim}-${idx}-${m.moduleId}`)}
                          <span class="mod-chip"><code>{m.moduleId}</code> {m.moduleName}</span>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>

                <div class="detail-actions">
                  <div class="status-picker">
                    <span class="muted small">状态：</span>
                    {#each ['draft','discussion','sample','archived'] as s}
                      <button
                        class="status-btn"
                        class:active={expandedCard.status === s}
                        onclick={() => changeStatus(card, s as ConceptCardStatus)}
                      >{statusLabel(s)}</button>
                    {/each}
                  </div>
                  <button class="btn btn-danger" onclick={() => deleteCard(card)}>删除</button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .concepts-page h1 { font-size: 26px; margin-bottom: 4px; }
  .sub { color: var(--gray-500); font-size: 13px; margin-bottom: 16px; }
  .page-header {
    display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16px;
  }
  :global(.new-btn) { text-decoration: none; }

  .filters {
    display: flex; gap: 10px; padding: 12px 16px; align-items: center; margin-bottom: 14px;
  }
  .filter-search {
    flex: 1; min-width: 200px;
    border: 1px solid var(--gray-200); border-radius: var(--radius-md);
    padding: 8px 12px; font-family: inherit; font-size: 13px; outline: none;
  }
  .filter-search:focus { border-color: var(--primary); }
  .filters select {
    border: 1px solid var(--gray-200); border-radius: var(--radius-md);
    padding: 8px 12px; font-family: inherit; font-size: 13px; background: white; cursor: pointer;
  }
  .count { color: var(--gray-500); font-size: 13px; margin-left: auto; }
  .count strong { color: var(--primary); font-family: var(--font-mono); }

  .empty {
    padding: 40px; text-align: center; color: var(--gray-500);
  }
  .empty.error { color: var(--danger); }
  .empty-emoji { font-size: 40px; margin-bottom: 10px; }

  .grid {
    display: grid; grid-template-columns: 1fr; gap: 12px;
  }
  .concept-card { padding: 0; transition: box-shadow 0.15s; }
  .concept-card.expanded { box-shadow: var(--shadow-lg); }
  .card-head {
    padding: 16px 20px;
    cursor: pointer;
  }
  .card-head:hover { background: var(--gray-50); }
  .title-row {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  }
  .name { font-size: 16px; margin: 0 0 6px 0; color: var(--gray-900); }
  .badges { display: flex; gap: 4px; flex-wrap: wrap; }
  .summary { font-size: 13px; color: var(--gray-700); margin: 4px 0 8px 0; line-height: 1.6; }
  .meta-row { font-size: 11px; color: var(--gray-500); display: flex; flex-wrap: wrap; gap: 4px; }
  .meta-tail { margin-left: auto; }

  .detail {
    border-top: 1px dashed var(--gray-200);
    padding: 14px 20px;
    background: var(--gray-50);
  }
  .detail-section { margin-bottom: 14px; }
  .d-label {
    font-size: 11px; color: var(--gray-500); text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 6px;
  }
  .raw-text {
    font-style: italic; color: var(--gray-700); font-size: 13px;
    background: white; padding: 8px 12px; border-radius: var(--radius-md); border-left: 3px solid var(--primary);
  }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip {
    background: var(--primary-light); color: var(--primary);
    padding: 3px 10px; border-radius: var(--radius-pill); font-size: 12px;
  }
  .ts-row {
    background: var(--primary-light); color: var(--primary);
    padding: 8px 12px; border-radius: var(--radius-md); font-size: 13px;
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .sales-tag { color: var(--success); font-weight: 700; margin-left: auto; font-family: var(--font-mono); }

  .mod-dim { margin: 8px 0; }
  .mod-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .mod-chip {
    background: white; padding: 3px 8px; border-radius: var(--radius-sm);
    font-size: 12px; color: var(--gray-700); border: 1px solid var(--gray-200);
  }
  .mod-chip code { color: var(--primary); margin-right: 4px; }

  .detail-actions {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid var(--gray-200); padding-top: 12px; gap: 10px; flex-wrap: wrap;
  }
  .status-picker { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
  .status-btn {
    background: white; border: 1px solid var(--gray-200);
    padding: 4px 10px; border-radius: var(--radius-pill); cursor: pointer;
    font-family: inherit; font-size: 12px; color: var(--gray-700);
  }
  .status-btn:hover { background: var(--gray-100); }
  .status-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
  .btn-danger {
    background: white; color: var(--danger); border: 1px solid var(--danger);
    padding: 4px 14px; border-radius: var(--radius-md); cursor: pointer;
    font-family: inherit; font-size: 12px;
  }
  .btn-danger:hover { background: var(--danger); color: white; }

  :global(.pill.pill-q-star)       { background: #fef3c7; color: #92400e; }
  :global(.pill.pill-q-potential)  { background: #dbeafe; color: #1d4ed8; }
  :global(.pill.pill-q-redsea)     { background: #fee2e2; color: #b91c1c; }
  :global(.pill.pill-q-chicken)    { background: #f3f4f6; color: var(--gray-500); }
  :global(.pill.pill-status-draft)       { background: #e0e7ff; color: #3730a3; }
  :global(.pill.pill-status-discussion)  { background: #fef3c7; color: #92400e; }
  :global(.pill.pill-status-sample)      { background: #d1fae5; color: #065f46; }
  :global(.pill.pill-status-archived)    { background: var(--gray-100); color: var(--gray-500); }
  .muted.small { font-size: 11px; }
</style>
