<script lang="ts">
  import { onMount } from 'svelte';
  import { Link } from 'svelte-routing';
  import { api } from '../lib/api';
  import { authState } from '../lib/auth.svelte';
  import Icon from '../lib/Icon.svelte';
  import type {
    ConceptCardSummary,
    ConceptCardSaved,
    ConceptCardStatus,
    QuadrantLabel,
  } from '../lib/types';

  // 4 象限的 Lucide 图标映射（和 Compose 保持一致）
  const QUADRANT_ICON: Record<string, 'crown' | 'sparkles' | 'waves' | 'minus-circle'> = {
    star: 'crown',
    potential: 'sparkles',
    redsea: 'waves',
    chicken: 'minus-circle',
  };

  let items = $state<ConceptCardSummary[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // 过滤
  let q = $state('');
  let quadrantFilter = $state<QuadrantLabel>('');
  let statusFilter = $state<ConceptCardStatus | ''>('');

  // 展开看详情
  let expandedId = $state<string | null>(null);
  let expandedCard = $state<ConceptCardSaved | null>(null);
  let expandedLoading = $state(false);

  // ============ 编辑态 ============
  // 整个详情进入编辑模式
  let editMode = $state(false);
  let editName = $state('');
  let editNote = $state('');
  let editCategories = $state<string[]>([]);
  let editBrands = $state<string[]>([]);
  let editUserScenes = $state<string[]>([]);
  let editFunctions = $state<string[]>([]);
  let editStyles = $state<string[]>([]);

  type DimKey = 'categories' | 'brands' | 'userScenes' | 'functions' | 'styles';
  const DIM_DEFS: Array<{ key: DimKey; label: string; placeholder: string }> = [
    { key: 'categories', label: '品类', placeholder: '如 护腰' },
    { key: 'brands',     label: '品牌', placeholder: '如 SERUNA' },
    { key: 'userScenes', label: '场景', placeholder: '如 户外运动' },
    { key: 'functions',  label: '功能', placeholder: '如 透气、防滑' },
    { key: 'styles',     label: '风格', placeholder: '如 极简' },
  ];
  let editingDim = $state<DimKey | null>(null);
  let editingValue = $state('');

  // 备注润色
  let polishingNote = $state(false);
  let noteBeforePolish = $state<string | null>(null);
  let polishNoteError = $state<string | null>(null);

  // 保存状态
  let savingEdit = $state(false);
  let saveEditError = $state<string | null>(null);

  // 复制状态（toast：源卡片刚被复制成功，按钮短暂显示 ✓）
  let copiedSourceId = $state<string | null>(null);
  let duplicating = $state(false);

  function getEditArr(key: DimKey): string[] {
    if (key === 'categories') return editCategories;
    if (key === 'brands') return editBrands;
    if (key === 'userScenes') return editUserScenes;
    if (key === 'functions') return editFunctions;
    return editStyles;
  }
  function setEditArr(key: DimKey, arr: string[]): void {
    if (key === 'categories') editCategories = arr;
    else if (key === 'brands') editBrands = arr;
    else if (key === 'userScenes') editUserScenes = arr;
    else if (key === 'functions') editFunctions = arr;
    else editStyles = arr;
  }

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
      cancelEdit();
      return;
    }
    expandedId = id;
    expandedCard = null;
    expandedLoading = true;
    cancelEdit();
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

  // ============ 编辑模式 ============
  function startEdit() {
    if (!expandedCard) return;
    const pi = expandedCard.payload.parsedIntent as unknown as Record<string, unknown>;
    editName = expandedCard.name;
    editNote = expandedCard.note ?? '';
    // 兼容老卡：单值字段也包成数组
    editCategories = (pi.categories as string[] | undefined)
      ?? (pi.category ? [pi.category as string] : []);
    editBrands = (pi.brands as string[] | undefined)
      ?? (pi.brand ? [pi.brand as string] : []);
    editStyles = (pi.styles as string[] | undefined)
      ?? (pi.style ? [pi.style as string] : []);
    editUserScenes = (pi.userScenes as string[] | undefined) ?? [];
    editFunctions = (pi.functions as string[] | undefined) ?? [];
    editingDim = null;
    editingValue = '';
    noteBeforePolish = null;
    polishNoteError = null;
    saveEditError = null;
    editMode = true;
  }
  function cancelEdit() {
    editMode = false;
    editingDim = null;
    editingValue = '';
    noteBeforePolish = null;
    polishNoteError = null;
    saveEditError = null;
  }
  function startEditDim(dim: DimKey) {
    editingDim = dim;
    editingValue = '';
  }
  function cancelEditDim() {
    editingDim = null;
    editingValue = '';
  }
  function commitEditDim() {
    if (!editingDim) return;
    const v = editingValue.trim();
    if (!v) { cancelEditDim(); return; }
    const arr = getEditArr(editingDim);
    if (!arr.includes(v)) setEditArr(editingDim, [...arr, v]);
    editingValue = '';
  }
  function removeFromDim(dim: DimKey, value: string) {
    setEditArr(dim, getEditArr(dim).filter((x) => x !== value));
  }

  async function polishNote() {
    const original = editNote.trim();
    if (!original || polishingNote) return;
    polishingNote = true;
    polishNoteError = null;
    try {
      const r = await api.polish(original);
      noteBeforePolish = editNote;
      editNote = r.polished;
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      polishNoteError = msg ?? (e instanceof Error ? e.message : String(e));
    } finally {
      polishingNote = false;
    }
  }
  function revertPolishNote() {
    if (noteBeforePolish === null) return;
    editNote = noteBeforePolish;
    noteBeforePolish = null;
    polishNoteError = null;
  }

  async function commitEdit() {
    if (!expandedCard) return;
    const name = editName.trim();
    if (!name) {
      saveEditError = '名字不能为空';
      return;
    }
    savingEdit = true;
    saveEditError = null;
    try {
      const oldPi = expandedCard.payload.parsedIntent as unknown as Record<string, unknown>;
      const newPi: Record<string, unknown> = {
        ...oldPi,
        categories: editCategories,
        brands: editBrands,
        userScenes: editUserScenes,
        functions: editFunctions,
        styles: editStyles,
      };
      // 移除老的单值字段（避免新旧并存）
      delete newPi.category;
      delete newPi.brand;
      delete newPi.style;

      const updated = await api.updateCard(expandedCard.id, {
        name,
        note: editNote,
        parsedIntent: newPi,
      });
      expandedCard = updated;
      editMode = false;
      await refresh();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      saveEditError = msg ?? (e instanceof Error ? e.message : String(e));
    } finally {
      savingEdit = false;
    }
  }

  // ============ 一键复制（复制成新卡片） ============
  async function duplicateCard(card: ConceptCardSummary) {
    if (duplicating) return;
    duplicating = true;
    try {
      const src = await api.getCard(card.id);
      const newName = src.name.includes('（副本）') ? src.name : `${src.name}（副本）`;
      const created = await api.saveCard({
        name: newName,
        summary: src.summary,
        rawText: src.rawText,
        userQuadrant: src.userQuadrant,
        author: authState.user ?? src.author,
        note: src.note ?? '',
        payload: src.payload,
      });
      // 标记源卡片刚刚被复制（按钮短暂变 ✓ 已复制）
      copiedSourceId = card.id;
      setTimeout(() => { if (copiedSourceId === card.id) copiedSourceId = null; }, 2000);
      // 刷新列表（新副本会自动出现在顶部，按 createdAt 倒序）
      await refresh();
      // 自动展开新副本，方便立即编辑
      expandedId = created.id;
      expandedCard = created;
      cancelEdit();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      alert('复制失败：' + (msg ?? (e instanceof Error ? e.message : String(e))));
    } finally {
      duplicating = false;
    }
  }

  function quadrantLabel(q: string): string {
    return ({ star: '明星', potential: '潜力', redsea: '红海', chicken: '鸡肋' } as Record<string, string>)[q] ?? '未选';
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
      <h1><Icon name="clipboard-list" size={22} /> 概念卡库</h1>
      <p class="sub">由组合器沉淀，按状态推进到讨论 / 打样 / 归档</p>
    </div>
    <Link to="/compose" class="btn btn-primary new-btn"><Icon name="plus" size={14} /> 去组合器写新草案</Link>
  </div>

  <div class="filters card">
    <span class="search-wrap">
      <Icon name="search" size={14} class="search-icon" />
      <input
        type="text"
        class="filter-search"
        placeholder="搜索 名字/摘要/原始想法..."
        bind:value={q}
        oninput={refresh}
      />
    </span>
    <select bind:value={quadrantFilter} onchange={refresh}>
      <option value="">所有象限</option>
      <option value="star">明星</option>
      <option value="potential">潜力</option>
      <option value="redsea">红海</option>
      <option value="chicken">鸡肋</option>
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
    <div class="card empty"><Icon name="loader-2" size={16} class="spin" /> 加载中…</div>
  {:else if error}
    <div class="card empty error"><Icon name="alert-circle" size={16} /> {error}</div>
  {:else if items.length === 0}
    <div class="card empty">
      <div class="empty-emoji"><Icon name="clipboard-list" size={36} /></div>
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
                {#if card.userQuadrant}
                  <span class="pill pill-q-{card.userQuadrant}">
                    <Icon name={QUADRANT_ICON[card.userQuadrant] ?? 'sparkles'} size={11} />
                    {quadrantLabel(card.userQuadrant)}
                  </span>
                {/if}
                <span class="pill pill-status-{card.status}">{statusLabel(card.status)}</span>
              </div>
            </div>
            <p class="summary">{card.summary}</p>
            <div class="meta-row">
              <span class="meta-chip"><Icon name="package" size={11} /> {card.totalMatchedModules} 模块</span>
              {#if card.parsedCategory}<span class="dot">·</span><span>{card.parsedCategory}</span>{/if}
              {#if card.parsedBrand}<span class="dot">·</span><span>{card.parsedBrand}</span>{/if}
              <span class="meta-tail">· {card.author} · {fmtDate(card.createdAt)}</span>
            </div>
          </div>

          {#if expandedId === card.id}
            <div class="detail">
              {#if expandedLoading}
                <div class="muted"><Icon name="loader-2" size={14} class="spin" /> 加载详情…</div>
              {:else if expandedCard}
                {@const pi = expandedCard.payload.parsedIntent as unknown as Record<string, unknown>}
                {@const cats = (pi.categories as string[] | undefined) ?? (pi.category ? [pi.category as string] : [])}
                {@const brds = (pi.brands as string[] | undefined) ?? (pi.brand ? [pi.brand as string] : [])}
                {@const stys = (pi.styles as string[] | undefined) ?? (pi.style ? [pi.style as string] : [])}
                {@const scns = (pi.userScenes as string[] | undefined) ?? []}
                {@const fns = (pi.functions as string[] | undefined) ?? []}

                <!-- 原始输入（始终只读） -->
                <div class="detail-section">
                  <div class="d-label">原始输入</div>
                  <div class="raw-text">"{expandedCard.rawText}"</div>
                </div>

                <!-- 名字（仅编辑模式可改） -->
                {#if editMode}
                  <div class="detail-section">
                    <div class="d-label">概念卡名字</div>
                    <input class="edit-input wide" type="text" bind:value={editName} maxlength="200" />
                  </div>
                {/if}

                <!-- 解析维度：编辑模式可增减；只读模式纯展示 -->
                <div class="detail-section">
                  <div class="d-label">解析维度</div>
                  {#if !editMode}
                    <div class="chips">
                      {#each cats as c}<span class="chip">品类 {c}</span>{/each}
                      {#each brds as b}<span class="chip">品牌 {b}</span>{/each}
                      {#each scns as s}<span class="chip">场景 {s}</span>{/each}
                      {#each fns as f}<span class="chip">功能 {f}</span>{/each}
                      {#each stys as s}<span class="chip">风格 {s}</span>{/each}
                      {#if cats.length === 0 && brds.length === 0 && scns.length === 0 && fns.length === 0 && stys.length === 0}
                        <span class="chip" style="opacity:0.6">（空）</span>
                      {/if}
                    </div>
                  {:else}
                    {#each DIM_DEFS as def (def.key)}
                      <div class="edit-dim-row">
                        <span class="dim-key">{def.label}</span>
                        <div class="dim-vals">
                          {#each getEditArr(def.key) as v (v)}
                            <span class="chip removable">
                              {v}
                              <button class="chip-x" onclick={() => removeFromDim(def.key, v)} aria-label="移除"><Icon name="x" size={11} /></button>
                            </span>
                          {/each}
                          {#if editingDim === def.key}
                            <span class="inline-input">
                              <input
                                type="text"
                                bind:value={editingValue}
                                onkeydown={(e) => { if (e.key === 'Enter') commitEditDim(); if (e.key === 'Escape') cancelEditDim(); }}
                                placeholder={def.placeholder}
                                autofocus
                              />
                              <button onclick={commitEditDim} class="mini-btn ok" aria-label="加入"><Icon name="check" size={11} /></button>
                              <button onclick={cancelEditDim} class="mini-btn" aria-label="完成"><Icon name="x" size={11} /></button>
                            </span>
                          {:else}
                            <button class="plus-btn" onclick={() => startEditDim(def.key)}><Icon name="plus" size={10} /> 加</button>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  {/if}
                </div>

                {#if expandedCard.payload.assetComparison.topSeller}
                  <div class="detail-section">
                    <div class="d-label">对照爆品</div>
                    <div class="ts-row">
                      <Icon name="trophy" size={15} /> {expandedCard.payload.assetComparison.topSeller.brand}
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

                <!-- 备注：编辑模式可改 + 润色；只读模式仅展示 -->
                <div class="detail-section note-section">
                  <div class="d-label"><Icon name="pen-line" size={13} /> 备注（业务讨论意见）</div>
                  {#if !editMode}
                    {#if expandedCard.note}
                      <div class="note-view">{expandedCard.note}</div>
                    {:else}
                      <div class="note-empty">暂无备注 · 点编辑写一条</div>
                    {/if}
                  {:else}
                    <textarea
                      class="edit-textarea"
                      bind:value={editNote}
                      placeholder="例如：讨论后建议加冰丝面料，对标 Y76K，已通知打样..."
                      rows="3"
                      maxlength="4000"
                      disabled={polishingNote}
                    ></textarea>
                    <div class="note-actions">
                      <button class="btn btn-ghost btn-sm" onclick={polishNote} disabled={polishingNote || !editNote.trim()}>
                        {#if polishingNote}<Icon name="loader-2" size={12} class="spin" /> 润色中…{:else}<Icon name="sparkles" size={12} /> 润色备注{/if}
                      </button>
                      {#if noteBeforePolish !== null}
                        <button class="btn btn-ghost btn-sm" onclick={revertPolishNote} disabled={polishingNote}><Icon name="rotate-ccw" size={12} /> 还原润色前</button>
                      {/if}
                    </div>
                    {#if polishNoteError}
                      <div class="polish-err small"><Icon name="alert-triangle" size={12} /> 润色失败：{polishNoteError}</div>
                    {/if}
                  {/if}
                </div>

                <!-- 编辑模式下的保存/取消 + 错误 -->
                {#if editMode}
                  {#if saveEditError}
                    <div class="save-err"><Icon name="alert-circle" size={14} /> 保存失败：{saveEditError}</div>
                  {/if}
                  <div class="detail-actions edit-actions">
                    <button class="btn btn-ghost" onclick={cancelEdit} disabled={savingEdit}>取消</button>
                    <button class="btn btn-primary" onclick={commitEdit} disabled={savingEdit || !editName.trim()}>
                      {#if savingEdit}<Icon name="loader-2" size={13} class="spin" /> 保存中…{:else}<Icon name="check" size={13} /> 确定修改{/if}
                    </button>
                  </div>
                {:else}
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
                    <div class="action-buttons">
                      <button class="btn btn-ghost btn-sm" onclick={() => duplicateCard(card)} disabled={duplicating}>
                        {#if copiedSourceId === card.id}<Icon name="check" size={12} /> 已复制为新卡
                        {:else if duplicating}<Icon name="loader-2" size={12} class="spin" /> 复制中…
                        {:else}<Icon name="copy" size={12} /> 复制{/if}
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick={startEdit}><Icon name="pencil" size={12} /> 编辑</button>
                      <button class="btn btn-danger" onclick={() => deleteCard(card)}><Icon name="trash-2" size={12} /> 删除</button>
                    </div>
                  </div>
                {/if}
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
  .search-wrap {
    position: relative; flex: 1; min-width: 200px;
    display: flex; align-items: center;
  }
  :global(.search-wrap .search-icon) {
    position: absolute; left: 12px; color: var(--gray-400); pointer-events: none;
  }
  .filter-search {
    width: 100%;
    border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: 8px 12px 8px 34px; font-family: inherit; font-size: 13px; outline: none;
    transition: border-color var(--t-fast), box-shadow var(--t-fast);
    background: white;
  }
  .filter-search:focus { border-color: var(--primary); box-shadow: var(--ring); }
  .meta-chip { display: inline-flex; align-items: center; gap: 3px; }
  .dot { color: var(--gray-300); }
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

  /* === C/D/E：编辑、复制、备注、润色 === */
  .action-buttons {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .btn-sm {
    padding: 4px 12px;
    font-size: 12px;
  }
  .edit-input.wide {
    width: 100%;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    font-family: inherit;
    font-size: 14px;
    outline: none;
  }
  .edit-input.wide:focus { border-color: var(--primary); }
  .edit-dim-row {
    display: flex; gap: 10px; align-items: center;
    padding: 6px 0;
    border-bottom: 1px dashed var(--gray-100);
    flex-wrap: wrap;
  }
  .edit-dim-row:last-child { border-bottom: 0; }
  .dim-key {
    width: 40px; font-size: 11px; color: var(--gray-500);
    text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0;
  }
  .dim-vals {
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 1;
  }
  .chip.removable { padding-right: 4px; }
  .chip-x {
    background: transparent; border: 0; color: var(--primary);
    font-size: 14px; line-height: 1; cursor: pointer;
    padding: 0 4px; border-radius: 999px; opacity: 0.6;
  }
  .chip-x:hover { opacity: 1; background: rgba(0,0,0,0.06); }
  .plus-btn {
    background: transparent; border: 1px dashed var(--gray-300);
    color: var(--gray-500); padding: 3px 8px;
    border-radius: var(--radius-pill); font-size: 11px; cursor: pointer;
    font-family: inherit;
  }
  .plus-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
  .inline-input { display: inline-flex; align-items: center; gap: 4px; }
  .inline-input input {
    border: 1px solid var(--gray-300); border-radius: var(--radius-md);
    padding: 3px 8px; font-size: 12px; font-family: inherit; outline: none; width: 130px;
  }
  .inline-input input:focus { border-color: var(--primary); }
  .mini-btn {
    background: var(--gray-100); border: 0; border-radius: var(--radius-sm);
    width: 22px; height: 22px; font-size: 11px; cursor: pointer; color: var(--gray-700);
  }
  .mini-btn.ok { background: var(--primary-light); color: var(--primary); }

  .note-section { background: white; padding: 12px; border-radius: var(--radius-md); }
  .note-view {
    white-space: pre-wrap; color: var(--gray-700); font-size: 13px;
    background: var(--gray-50); padding: 10px 12px; border-radius: var(--radius-md);
    border-left: 3px solid var(--success); line-height: 1.6;
  }
  .note-empty {
    color: var(--gray-400); font-size: 12px; font-style: italic;
    padding: 6px 4px;
  }
  .edit-textarea {
    width: 100%; border: 1px solid var(--gray-200);
    border-radius: var(--radius-md); padding: 8px 12px;
    font-family: inherit; font-size: 13px; outline: none;
    resize: vertical; line-height: 1.6;
  }
  .edit-textarea:focus { border-color: var(--primary); }
  .note-actions { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
  .polish-err.small {
    margin-top: 6px; padding: 4px 8px;
    background: #fef3c7; color: #92400e;
    border-radius: var(--radius-md); font-size: 11px;
  }
  .save-err {
    margin: 8px 0; padding: 8px 12px;
    background: #fee2e2; color: var(--danger);
    border-radius: var(--radius-md); font-size: 12px;
  }
  .edit-actions { justify-content: flex-end; }

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
