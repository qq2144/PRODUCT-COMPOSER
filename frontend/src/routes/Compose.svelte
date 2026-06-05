<script lang="ts">
  import { onMount } from 'svelte';
  import { Link } from 'svelte-routing';
  import { api } from '../lib/api';
  import { authState } from '../lib/auth.svelte';
  import Icon from '../lib/Icon.svelte';
  import type { ComposeResult, MatchedModule, QuadrantLabel } from '../lib/types';

  let text = $state('');
  let result = $state<ComposeResult | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // 润色相关
  let polishing = $state(false);
  let polishedFrom = $state<string | null>(null);  // 润色前的原文；null = 当前不是润色态
  let polishError = $state<string | null>(null);

  // M5/M6：保存概念卡相关状态
  // author 默认 = 登录用户；用户可改成"团队"或任何字符串
  let author = $state(authState.user ?? '内部用户');
  let saving = $state(false);
  let savedId = $state<string | null>(null);
  let saveError = $state<string | null>(null);

  // 解析维度增补的内联输入
  // 5 个维度全部多值：categories / brands / userScenes / functions / styles
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

  // 加模块弹窗
  let addModDim = $state<string | null>(null);   // 'module_type_sheet' 的值
  let addModName = $state('');
  let addModDesc = $state('');
  let addModSaving = $state(false);
  let addModError = $state<string | null>(null);

  /** 用户自选的 4 象限标签 */
  let userQuadrant = $state<QuadrantLabel>('');

  // 从 URL query 读 text —— v1.1：只填进去，不自动执行
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const initText = params.get('text');
    if (initText) text = initText;
  });

  // 6 大模块维度的契约顺序，始终展示（命中 0 也显示便于补录）
  const CANONICAL_MODULE_DIMS = ['版型模块', '面料模块', '结构模块', '外观模块', '功能模块', '包装模块'];

  // 登录用户变化时同步 author 默认值（只在还没改过时）
  $effect(() => {
    if (authState.user && (!author || author === '内部用户')) {
      author = authState.user;
    }
  });

  const examples = [
    '我想做一个 SERUNA 风格的护膝，要舒适、包裹性强，户外运动能用',
    'TMT 透气护腕，专业运动场景',
    '奈肤 助眠眼罩，亲肤极简风',
  ];

  // 4 象限：每个用一个独特的 Lucide 图标 + 自己的色阶
  const QUADRANT_OPTIONS: Array<{ key: QuadrantLabel; icon: 'crown' | 'sparkles' | 'waves' | 'minus-circle'; label: string; hint: string }> = [
    { key: 'star',      icon: 'crown',         label: '明星', hint: '大市场 × 强需求 · 重点投入' },
    { key: 'potential', icon: 'sparkles',      label: '潜力', hint: '小市场 × 强需求 · 小样测试' },
    { key: 'redsea',    icon: 'waves',         label: '红海', hint: '大市场 × 弱需求 · 需明显差异' },
    { key: 'chicken',   icon: 'minus-circle',  label: '鸡肋', hint: '小市场 × 弱需求 · 默认放弃' },
  ];

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) {
      error = '请先在上方写一句产品描述';
      return;
    }
    if (loading) return;   // 防重复提交
    loading = true;
    error = null;
    result = null;
    userQuadrant = '';
    savedId = null;
    saveError = null;
    editingDim = null;
    try {
      result = await api.compose(trimmed);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      error = msg ?? (e instanceof Error ? e.message : String(e));
    } finally {
      loading = false;
    }
  }

  async function saveCard() {
    if (!result) return;
    saving = true;
    saveError = null;
    try {
      const cleanAuthor = author.trim() || authState.user || '内部用户';
      const saved = await api.saveCard({
        name: result.conceptCardDraft.name,
        summary: result.conceptCardDraft.summary,
        rawText: text,
        userQuadrant,
        author: cleanAuthor,
        payload: {
          parsedIntent: result.parsedIntent,
          matchedModules: result.matchedModules,
          totalMatchedModules: result.totalMatchedModules,
          assetComparison: result.assetComparison,
          conceptCardDraft: result.conceptCardDraft,
        },
      });
      savedId = saved.id;
    } catch (e) {
      saveError = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }

  function loadExample(t: string) {
    text = t;
    polishedFrom = null;
    polishError = null;
    // v1.1：例句只填进去，用户需自己点"开始组合 →"
  }

  async function doPolish() {
    const original = text.trim();
    if (!original || polishing) return;
    polishing = true;
    polishError = null;
    try {
      const r = await api.polish(original);
      polishedFrom = text;
      text = r.polished;
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      polishError = msg ?? (e instanceof Error ? e.message : String(e));
    } finally {
      polishing = false;
    }
  }
  function revertPolish() {
    if (polishedFrom === null) return;
    text = polishedFrom;
    polishedFrom = null;
    polishError = null;
  }

  function selectQuadrant(q: QuadrantLabel) {
    userQuadrant = userQuadrant === q ? '' : q;
  }

  function quadrantClass(label: QuadrantLabel): string {
    if (label === 'star') return 'q-star';
    if (label === 'potential') return 'q-potential';
    if (label === 'redsea') return 'q-red';
    if (label === 'chicken') return 'q-chicken';
    return '';
  }

  // ============ 维度增减 ============
  function startEditDim(dim: DimKey) {
    editingDim = dim;
    editingValue = '';
  }
  function cancelEditDim() {
    editingDim = null;
    editingValue = '';
  }
  function commitEditDim() {
    if (!result || !editingDim) return;
    const v = editingValue.trim();
    if (!v) { cancelEditDim(); return; }
    const arr = result.parsedIntent[editingDim];
    if (!arr.includes(v)) arr.push(v);
    editingValue = '';   // 留在编辑态，连续加
  }
  function removeFromDim(dim: DimKey, value: string) {
    if (!result) return;
    result.parsedIntent[dim] = result.parsedIntent[dim].filter((x) => x !== value);
  }

  // ============ 加模块 ============
  function openAddModule(dim: string) {
    addModDim = dim;
    addModName = '';
    addModDesc = '';
    addModError = null;
  }
  function closeAddModule() {
    addModDim = null;
    addModName = '';
    addModDesc = '';
    addModError = null;
  }
  async function submitAddModule() {
    if (!result || !addModDim) return;
    const name = addModName.trim();
    if (!name) {
      addModError = '模块名不能为空';
      return;
    }
    addModSaving = true;
    addModError = null;
    try {
      const mod = await api.addModule({
        dimension: addModDim,
        name,
        description: addModDesc.trim(),
      });
      // 推入当前结果（作为新匹配项）
      const matched: MatchedModule = {
        moduleId: mod.module_id,
        moduleType: mod.module_type_sheet,
        moduleName: mod.module_name,
        factory: mod.factory_src,
        material: mod.material,
        reuseCount: 0,
        matchedKeywords: ['+ 新加入'],
        matchReason: `${authState.user ?? '内部用户'} 刚加入`,
      };
      if (!result.matchedModules[addModDim]) {
        result.matchedModules[addModDim] = [];
      }
      result.matchedModules[addModDim]!.unshift(matched);
      result.totalMatchedModules += 1;
      closeAddModule();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addModError = msg ?? (e instanceof Error ? e.message : String(e));
    } finally {
      addModSaving = false;
    }
  }
</script>

<div class="compose-page">
  <h1><Icon name="sparkles" size={22} /> 产品组合器</h1>
  <p class="sub">用一句话描述产品想法 → 解析 5 维度 → 匹配模块 → 自动对照分析 → 概念卡草案</p>

  <!-- 输入区 -->
  <div class="card input-area">
    <label class="input-label" for="compose-input">说一句你想做什么产品</label>
    <textarea
      id="compose-input"
      class="prompt-input"
      bind:value={text}
      placeholder="例如：我想做一个 SERUNA 风格的护膝，要舒适、包裹性强，户外运动能用"
      rows="3"
    ></textarea>
    {#if polishedFrom !== null}
      <div class="polish-status">
        <Icon name="sparkles" size={13} /> 已润色 ·
        <button class="link-btn" onclick={revertPolish}><Icon name="rotate-ccw" size={12} /> 还原润色前</button>
      </div>
    {/if}
    {#if polishError}
      <div class="polish-err"><Icon name="alert-triangle" size={13} /> 润色失败：{polishError}</div>
    {/if}
    <div class="input-actions">
      <div class="examples">
        <span class="muted">试试：</span>
        {#each examples as ex}
          <button class="example-btn" onclick={() => loadExample(ex)} disabled={loading || polishing}>
            {ex.slice(0, 18)}...
          </button>
        {/each}
      </div>
      <button class="btn btn-ghost polish-btn" onclick={doPolish} disabled={polishing || loading || !text.trim()}>
        {#if polishing}<Icon name="loader-2" size={14} class="spin" /> 润色中…{:else}<Icon name="sparkles" size={14} /> 润色{/if}
      </button>
      <button class="btn btn-primary" onclick={submit} disabled={loading || polishing || !text.trim()}>
        {#if loading}<Icon name="loader-2" size={14} class="spin" /> 解析中…{:else}开始组合 <Icon name="arrow-right" size={14} />{/if}
      </button>
    </div>
  </div>

  <!-- 错误 -->
  {#if error}
    <div class="card error">
      <div class="err-head"><Icon name="alert-circle" size={16} /> {error}</div>
      {#if !error.startsWith('请先')}
        <p class="error-tip">若是网络问题，请确认后端已起来（<code>pnpm dev:backend</code>）；若反复出错可截图发给开发。</p>
      {/if}
    </div>
  {/if}

  <!-- 结果 -->
  {#if result}
    <!-- 1. 5 维度解析（每维度都可自由增减） -->
    <div class="card section">
      <div class="section-title">
        <Icon name="brain" size={16} class="t-icon" /> 解析的 5 维度
        <span class="muted small">— 每个维度都可自由加 / 删；连续 Enter 多加几个</span>
      </div>

      {#each DIM_DEFS as def (def.key)}
        <div class="dim-row">
          <span class="dim-key">{def.label}</span>
          <div class="dim-vals">
            {#each result.parsedIntent[def.key] as v (v)}
              <span class="chip removable">
                {v}
                <button class="chip-x" onclick={() => removeFromDim(def.key, v)} aria-label="移除"><Icon name="x" size={12} /></button>
              </span>
            {/each}
            {#if result.parsedIntent[def.key].length === 0 && editingDim !== def.key}
              <span class="chip chip-empty">未识别</span>
            {/if}
            {#if editingDim === def.key}
              <span class="inline-input">
                <input
                  type="text"
                  bind:value={editingValue}
                  onkeydown={(e) => { if (e.key === 'Enter') commitEditDim(); if (e.key === 'Escape') cancelEditDim(); }}
                  placeholder={def.placeholder}
                  autofocus
                />
                <button onclick={commitEditDim} class="mini-btn ok" aria-label="加入"><Icon name="check" size={12} /></button>
                <button onclick={cancelEditDim} class="mini-btn" aria-label="完成"><Icon name="x" size={12} /></button>
              </span>
            {:else}
              <button class="plus-btn" onclick={() => startEditDim(def.key)}><Icon name="plus" size={11} /> 加</button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- 2. 同品类资产对照 -->
    <div class="card section">
      <div class="section-title"><Icon name="bar-chart-3" size={16} class="t-icon" /> 同品类资产对照（事实数据，不评判）</div>

      <div class="facts-grid">
        <div class="fact-item">
          <div class="fact-num">{result.assetComparison.sameCategorySkuCount.toLocaleString()}</div>
          <div class="fact-label">同品类 SKU 销售行</div>
        </div>
        <div class="fact-item">
          <div class="fact-num">{result.assetComparison.sameCategoryBrands.length}</div>
          <div class="fact-label">涉及品牌</div>
        </div>
        <div class="fact-item">
          <div class="fact-num">
            {result.assetComparison.topSeller?.totalSales.toLocaleString() ?? '—'}
          </div>
          <div class="fact-label">同品类销量</div>
        </div>
        <div class="fact-item">
          <div class="fact-num">{result.assetComparison.competitorIntelCount}</div>
          <div class="fact-label">竞品情报</div>
        </div>
      </div>

      {#if result.assetComparison.topSeller}
        <div class="top-seller-row">
          <Icon name="trophy" size={15} /> <span class="muted">同品类爆品：</span>
          <span class="pill pill-primary">{result.assetComparison.topSeller.brand}</span>
          <code>{result.assetComparison.topSeller.productAbbrev}</code>
          {result.assetComparison.topSeller.name}
          <span class="sales-tag">销量 {result.assetComparison.topSeller.totalSales.toLocaleString()}</span>
        </div>
      {/if}

      {#if result.assetComparison.sameCategoryBrands.length > 0}
        <div class="brand-tags">
          <span class="muted small">已有品牌：</span>
          {#each result.assetComparison.sameCategoryBrands as b}
            <span class="pill pill-default">{b}</span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 3. 用户自选 4 象限 -->
    <div class="card section">
      <div class="section-title">
        <Icon name="target" size={16} class="t-icon" /> 你来判定机会象限
        <span class="muted small">— 基于上面的事实数据，你自己选</span>
      </div>
      <div class="quadrant-picker">
        {#each QUADRANT_OPTIONS as opt (opt.key)}
          <button
            class="q-option {quadrantClass(opt.key)}"
            class:q-selected={userQuadrant === opt.key}
            onclick={() => selectQuadrant(opt.key)}
            type="button"
          >
            <div class="q-emoji"><Icon name={opt.icon} size={22} /></div>
            <div class="q-label">{opt.label}</div>
            <div class="q-hint">{opt.hint}</div>
          </button>
        {/each}
      </div>
      {#if userQuadrant === ''}
        <div class="q-not-picked">未选 = 系统不替你打标签，可以一直留空</div>
      {/if}
    </div>

    <!-- 4. 模块匹配（始终展示 6 大维度；命中 0 也显示空槽便于补录） -->
    <div class="card section">
      <div class="section-title">
        <Icon name="puzzle" size={16} class="t-icon" /> 模块匹配（共 {result.totalMatchedModules} 条）
      </div>

      {#each CANONICAL_MODULE_DIMS as dim (dim)}
        {@const mods = result.matchedModules[dim] ?? []}
        <div class="module-dim" class:dim-empty={mods.length === 0}>
          <div class="dim-header">
            <span class="pill pill-info">{dim}</span>
            <span class="muted small">命中 {mods.length} 条</span>
            <button class="plus-btn" onclick={() => openAddModule(dim)}><Icon name="plus" size={11} /> 加新模块</button>
          </div>
          {#if mods.length === 0}
            <div class="module-empty">暂无匹配 · 可点上方 + 补一个</div>
          {:else}
            <div class="module-list">
              {#each mods as m (m.moduleId)}
                <div class="module-row" class:user-added={m.moduleId.startsWith('USR-')}>
                  <code class="module-id">{m.moduleId}</code>
                  <div class="module-body">
                    <div class="module-name">
                      {m.moduleName}
                      {#if m.moduleId.startsWith('USR-')}
                        <span class="pill pill-warn">用户补录</span>
                      {/if}
                    </div>
                    <div class="module-meta">
                      {#if m.factory}<span class="muted small">工厂 {m.factory}</span>{/if}
                      {#if m.material}<span class="muted small">材料 {m.material}</span>{/if}
                      <span class="muted small">复用 <strong>{m.reuseCount}</strong></span>
                    </div>
                  </div>
                  <div class="module-keywords">
                    {#each m.matchedKeywords as kw}
                      <span class="pill pill-success">{kw}</span>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      <!-- 如果 LLM 返回的维度超出 6 大规范（罕见），也都列出来 -->
      {#each Object.entries(result.matchedModules).filter(([d]) => !CANONICAL_MODULE_DIMS.includes(d)) as [dim, mods] (dim)}
        <div class="module-dim">
          <div class="dim-header">
            <span class="pill pill-info">{dim}</span>
            <span class="muted small">非标准维度 · 命中 {mods.length} 条</span>
            <button class="plus-btn" onclick={() => openAddModule(dim)}><Icon name="plus" size={11} /> 加新模块</button>
          </div>
          <div class="module-list">
            {#each mods as m (m.moduleId)}
              <div class="module-row" class:user-added={m.moduleId.startsWith('USR-')}>
                <code class="module-id">{m.moduleId}</code>
                <div class="module-body">
                  <div class="module-name">{m.moduleName}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- 5. 概念卡草案 -->
    <div class="card concept-card">
      <div class="concept-header">
        <span class="concept-tag"><Icon name="clipboard-list" size={11} /> 概念卡草案</span>
        <h2 class="concept-name">{result.conceptCardDraft.name}</h2>
      </div>
      <p class="concept-summary">{result.conceptCardDraft.summary}</p>
      <div class="concept-stats">
        <span class="pill pill-primary">{result.conceptCardDraft.moduleCount} 个匹配模块</span>
        {#if userQuadrant}
          {@const opt = QUADRANT_OPTIONS.find(o => o.key === userQuadrant)}
          {#if opt}
            <span class="pill {quadrantClass(userQuadrant)}"><Icon name={opt.icon} size={11} /> {opt.label}（你的判定）</span>
          {/if}
        {:else}
          <span class="pill pill-default">未选象限</span>
        {/if}
      </div>

      {#if result.conceptCardDraft.needsValidation.length > 0}
        <div class="needs-validation">
          <div class="nv-title"><Icon name="alert-triangle" size={13} /> 待补充/验证</div>
          {#each result.conceptCardDraft.needsValidation as v}
            <div class="nv-item">· {v}</div>
          {/each}
        </div>
      {/if}

      <div class="concept-actions">
        {#if !savedId}
          <label class="author-input">
            <span class="author-label">作者</span>
            <input
              type="text"
              bind:value={author}
              placeholder={authState.user ?? '内部用户'}
              disabled={saving}
              maxlength="60"
            />
          </label>
          {#if authState.user}
            <button class="mini-set" onclick={() => author = authState.user!} type="button" title="默认 = 你"><Icon name="rotate-ccw" size={11} /> 我</button>
            <button class="mini-set" onclick={() => author = '团队'} type="button" title="标团队产出"><Icon name="rotate-ccw" size={11} /> 团队</button>
          {/if}
          <button class="btn btn-primary" onclick={saveCard} disabled={saving}>
            {#if saving}<Icon name="loader-2" size={14} class="spin" /> 保存中…{:else}<Icon name="save" size={14} /> 保存概念卡{/if}
          </button>
        {:else}
          <span class="saved-tag"><Icon name="check" size={12} /> 已保存（{savedId}）</span>
          <Link to="/concepts" class="btn btn-primary">查看所有概念卡 <Icon name="arrow-right" size={13} /></Link>
        {/if}
        <button class="btn btn-ghost" onclick={() => { result = null; text = ''; savedId = null; }}><Icon name="rotate-ccw" size={13} /> 重新输入</button>
      </div>
      {#if saveError}
        <div class="save-error"><Icon name="alert-circle" size={14} /> 保存失败：{saveError}</div>
      {/if}
    </div>
  {/if}

  <!-- 加模块弹窗 -->
  {#if addModDim !== null}
    <div
      class="modal-backdrop"
      onclick={closeAddModule}
      onkeydown={(e) => { if (e.key === 'Escape') closeAddModule(); }}
      role="button"
      tabindex="-1"
    >
      <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
        <h3><Icon name="plus-circle" size={18} class="t-icon" /> 新增模块到「{addModDim}」</h3>
        <p class="modal-hint">
          作者：<strong>{authState.user ?? '内部用户'}</strong> · 状态：<code>待审</code>
        </p>
        <label>
          <span>模块名</span>
          <input
            type="text"
            bind:value={addModName}
            placeholder="如 冰感小雨点面料"
            maxlength="120"
            autofocus
            disabled={addModSaving}
          />
        </label>
        <label>
          <span>描述（可选）</span>
          <textarea
            bind:value={addModDesc}
            placeholder="材质/工厂/卖点/适用场景..."
            rows="4"
            maxlength="2000"
            disabled={addModSaving}
          ></textarea>
        </label>
        {#if addModError}
          <div class="modal-err"><Icon name="alert-circle" size={13} /> {addModError}</div>
        {/if}
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick={closeAddModule} disabled={addModSaving}>取消</button>
          <button class="btn btn-primary" onclick={submitAddModule} disabled={addModSaving || !addModName.trim()}>
            {#if addModSaving}<Icon name="loader-2" size={14} class="spin" /> 保存中…{:else}<Icon name="check" size={14} /> 保存并加入匹配{/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .compose-page h1 {
    font-size: 26px;
    margin-bottom: 4px;
  }
  .sub {
    color: var(--gray-500);
    font-size: 13px;
    margin-bottom: 20px;
  }

  .input-area { padding: 20px; }
  .input-label {
    display: block;
    font-size: 12px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .prompt-input {
    width: 100%;
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    font-size: 15px;
    font-family: var(--font-sans);
    outline: none;
    transition: all 0.15s;
    resize: vertical;
    line-height: 1.6;
  }
  .prompt-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(88, 86, 214, 0.12);
  }
  .input-actions {
    display: flex;
    align-items: center;
    margin-top: 12px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .examples {
    flex: 1;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .example-btn {
    background: var(--gray-100);
    border: none;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    color: var(--gray-700);
    cursor: pointer;
    font-family: inherit;
  }
  .example-btn:hover {
    background: var(--primary-light);
    color: var(--primary);
  }
  .example-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .polish-btn { white-space: nowrap; }
  .polish-status {
    margin-top: 8px;
    padding: 6px 10px;
    background: var(--primary-light);
    color: var(--primary);
    border-radius: var(--radius-md);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .polish-err {
    margin-top: 8px;
    padding: 6px 10px;
    background: #fef3c7;
    color: #92400e;
    border-radius: var(--radius-md);
    font-size: 12px;
  }
  .link-btn {
    background: transparent;
    border: 0;
    color: var(--primary);
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    font-family: inherit;
  }
  .link-btn:hover { opacity: 0.8; }
  .muted {
    color: var(--gray-400);
    font-size: 11px;
  }

  .error {
    color: var(--danger);
    padding: 14px 18px;
    margin-top: 14px;
  }
  .error-tip {
    margin-top: 4px;
    font-size: 12px;
  }

  .section { margin-top: 14px; }
  .section-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 维度展示（每行一维度） */
  .dim-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px dashed var(--gray-100);
    flex-wrap: wrap;
  }
  .dim-row:last-child { border-bottom: 0; }
  .dim-key {
    width: 48px;
    font-size: 12px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }
  .dim-vals {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    flex: 1;
  }
  .chip {
    background: var(--primary-light);
    color: var(--primary);
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    font-size: 13px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .chip.removable { padding-right: 4px; }
  .chip-x {
    background: transparent;
    border: 0;
    color: var(--primary);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
    border-radius: 999px;
    opacity: 0.6;
  }
  .chip-x:hover { opacity: 1; background: rgba(0,0,0,0.06); }
  .chip-empty {
    background: var(--gray-100);
    color: var(--gray-500);
    opacity: 0.7;
  }
  .plus-btn {
    background: transparent;
    border: 1px dashed var(--gray-300);
    color: var(--gray-500);
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }
  .plus-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: var(--primary-light);
  }
  .empty-plus {
    margin-right: 6px;
    margin-bottom: 6px;
  }
  .empty-dims { padding: 8px 0 4px; }

  .inline-input {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .inline-input input {
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    padding: 4px 10px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    width: 140px;
  }
  .inline-input input:focus { border-color: var(--primary); }
  .mini-btn {
    background: var(--gray-100);
    border: 0;
    border-radius: var(--radius-sm);
    width: 24px;
    height: 24px;
    font-size: 12px;
    cursor: pointer;
    color: var(--gray-700);
  }
  .mini-btn.ok { background: var(--primary-light); color: var(--primary); }
  .mini-btn:hover { background: var(--gray-200); }

  /* 事实数据展示 */
  .facts-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .fact-item {
    background: var(--gray-50);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    text-align: center;
  }
  .fact-num {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-mono);
    line-height: 1.2;
  }
  .fact-label {
    font-size: 11px;
    color: var(--gray-500);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .top-seller-row {
    background: var(--primary-light);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .sales-tag {
    color: var(--success);
    font-weight: 700;
    margin-left: auto;
    font-family: var(--font-mono);
  }
  .brand-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
    margin-top: 8px;
  }

  /* 4 象限 */
  .quadrant-picker {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .q-option {
    background: var(--gray-50);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    padding: 14px 12px;
    text-align: center;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    color: var(--gray-700);
  }
  .q-option:hover { background: var(--gray-100); transform: translateY(-1px); }
  .q-option .q-emoji { font-size: 28px; margin-bottom: 4px; }
  .q-option .q-label { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--gray-700); }
  .q-option .q-hint { font-size: 10px; color: var(--gray-500); line-height: 1.4; }
  .q-option.q-selected { border-width: 2px; box-shadow: var(--shadow-md); }
  .q-option.q-selected .q-label { color: white; font-weight: 700; }
  .q-option.q-selected .q-hint { color: rgba(255,255,255,0.85); }
  .q-option.q-star.q-selected         { background: #f59e0b; border-color: #d97706; }
  .q-option.q-potential.q-selected    { background: #3b82f6; border-color: #2563eb; }
  .q-option.q-red.q-selected          { background: #ef4444; border-color: #dc2626; }
  .q-option.q-chicken.q-selected      { background: var(--gray-500); border-color: var(--gray-700); }
  .q-not-picked {
    margin-top: 10px;
    font-size: 12px;
    color: var(--gray-500);
    text-align: center;
  }
  :global(.pill.q-star) { background: #fef3c7; color: #92400e; }
  :global(.pill.q-potential) { background: #dbeafe; color: #1d4ed8; }
  :global(.pill.q-red) { background: #fee2e2; color: #b91c1c; }
  :global(.pill.q-chicken) { background: #f3f4f6; color: var(--gray-500); }

  /* 模块列表 */
  .module-dim { margin-bottom: 14px; }
  .module-dim.dim-empty .dim-header .pill-info { opacity: 0.6; }
  .module-empty {
    color: var(--gray-400);
    font-size: 12px;
    padding: 10px 14px;
    background: var(--gray-50);
    border-radius: var(--radius-md);
    border: 1px dashed var(--gray-200);
  }
  .dim-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .module-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .module-row {
    display: grid;
    grid-template-columns: 130px 1fr 180px;
    gap: 12px;
    align-items: center;
    padding: 10px 14px;
    background: var(--gray-50);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--primary);
    font-size: 13px;
  }
  .module-row.user-added {
    background: #fffbeb;
    border-left-color: var(--warning);
  }
  .module-id {
    background: white;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    color: var(--gray-700);
    word-break: break-all;
  }
  .module-name {
    font-weight: 500;
    color: var(--gray-900);
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .module-meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .module-meta strong { color: var(--primary); }
  .module-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-end;
  }
  :global(.pill.pill-warn) {
    background: #fef3c7;
    color: #92400e;
    font-size: 10px;
    padding: 2px 6px;
  }

  /* 概念卡 */
  .concept-card {
    margin-top: 14px;
    background: linear-gradient(135deg, white, #fafbff);
    border: 2px solid var(--primary-light);
    padding: 24px 28px;
  }
  .concept-header { margin-bottom: 12px; }
  .concept-tag {
    display: inline-block;
    background: var(--primary);
    color: white;
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .concept-name {
    font-size: 22px;
    color: var(--gray-900);
  }
  .concept-summary {
    color: var(--gray-700);
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 12px;
  }
  .concept-stats {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .needs-validation {
    background: #fffbeb;
    border-left: 3px solid var(--warning);
    padding: 12px 14px;
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .nv-title { font-weight: 600; color: #92400e; margin-bottom: 6px; }
  .nv-item { color: #78350f; line-height: 1.7; }
  .concept-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .author-input {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--gray-50);
    padding: 4px 10px 4px 6px;
    border-radius: var(--radius-md);
    font-size: 13px;
  }
  .author-label {
    color: var(--gray-500);
    font-size: 11px;
    padding-left: 4px;
  }
  .author-input input {
    border: none;
    background: white;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 13px;
    width: 140px;
    outline: none;
  }
  .mini-set {
    background: var(--gray-100);
    border: 0;
    border-radius: var(--radius-pill);
    padding: 4px 10px;
    font-size: 11px;
    color: var(--gray-700);
    cursor: pointer;
    font-family: inherit;
  }
  .mini-set:hover { background: var(--primary-light); color: var(--primary); }
  .saved-tag {
    background: #d1fae5;
    color: #065f46;
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-family: var(--font-mono);
  }
  :global(.concept-actions a.btn) {
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  .save-error {
    margin-top: 10px;
    color: var(--danger);
    font-size: 13px;
    background: #fee2e2;
    padding: 8px 12px;
    border-radius: var(--radius-md);
  }

  /* 弹窗 */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal {
    background: white;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: 28px 32px;
    width: 480px;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .modal h3 { margin: 0; font-size: 18px; color: var(--gray-900); }
  .modal-hint {
    margin: 0;
    font-size: 12px;
    color: var(--gray-500);
  }
  .modal-hint strong { color: var(--primary); }
  .modal label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }
  .modal label span {
    font-size: 11px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .modal input,
  .modal textarea {
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    font-family: inherit;
    font-size: 14px;
    outline: none;
  }
  .modal input:focus,
  .modal textarea:focus { border-color: var(--primary); }
  .modal-err {
    color: var(--danger);
    font-size: 13px;
    background: #fee2e2;
    padding: 6px 10px;
    border-radius: var(--radius-md);
  }
  .modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }

  .muted.small { font-size: 11px; }
</style>
