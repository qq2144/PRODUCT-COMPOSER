<script lang="ts">
  import { api } from '../lib/api';
  import type { ComposeResult, QuadrantLabel } from '../lib/types';

  let text = $state('');
  let result = $state<ComposeResult | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  /** 用户自选的 4 象限标签 - 系统不评判，仅展示客观数据，用户基于事实判断 */
  let userQuadrant = $state<QuadrantLabel>('');

  const examples = [
    '我想做一个 SERUNA 风格的护膝，要舒适、包裹性强，户外运动能用',
    'TMT 透气护腕，专业运动场景',
    '奈肤 助眠眼罩，亲肤极简风',
  ];

  const QUADRANT_OPTIONS: Array<{ key: QuadrantLabel; emoji: string; label: string; hint: string }> = [
    { key: 'star',      emoji: '🌟', label: '明星', hint: '大市场 × 强需求 · 重点投入' },
    { key: 'potential', emoji: '⭐', label: '潜力', hint: '小市场 × 强需求 · 小样测试' },
    { key: 'redsea',    emoji: '🌊', label: '红海', hint: '大市场 × 弱需求 · 需明显差异' },
    { key: 'chicken',   emoji: '❌', label: '鸡肋', hint: '小市场 × 弱需求 · 默认放弃' },
  ];

  async function submit() {
    if (!text.trim()) return;
    loading = true;
    error = null;
    result = null;
    userQuadrant = '';
    try {
      result = await api.compose(text);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function loadExample(t: string) {
    text = t;
    submit();
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
</script>

<div class="compose-page">
  <h1>✨ 产品组合器</h1>
  <p class="sub">用一句话描述产品想法 → AI 解析 5 维度 → 匹配模块 → 自动对照分析 → 概念卡草案</p>

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
    <div class="input-actions">
      <div class="examples">
        <span class="muted">试试：</span>
        {#each examples as ex}
          <button class="example-btn" onclick={() => loadExample(ex)} disabled={loading}>
            {ex.slice(0, 18)}...
          </button>
        {/each}
      </div>
      <button class="btn btn-primary" onclick={submit} disabled={loading || !text.trim()}>
        {loading ? '解析中...' : '开始组合 →'}
      </button>
    </div>
  </div>

  <!-- 错误 -->
  {#if error}
    <div class="card error">
      ❌ {error}
      <p class="error-tip">请确认后端运行：<code>pnpm dev:backend</code></p>
    </div>
  {/if}

  <!-- 结果 -->
  {#if result}
    <!-- 1. 5 维度解析 -->
    <div class="card section">
      <div class="section-title">🧠 AI 解析的 5 维度</div>
      <div class="chips">
        <span class="chip" class:chip-empty={!result.parsedIntent.category}>
          <span class="chip-label">品类</span>
          {result.parsedIntent.category || '(未识别)'}
        </span>
        <span class="chip" class:chip-empty={!result.parsedIntent.brand}>
          <span class="chip-label">品牌</span>
          {result.parsedIntent.brand || '(未指定)'}
        </span>
        {#each result.parsedIntent.userScenes as scene}
          <span class="chip">
            <span class="chip-label">场景</span>{scene}
          </span>
        {/each}
        {#each result.parsedIntent.functions as fn}
          <span class="chip">
            <span class="chip-label">功能</span>{fn}
          </span>
        {/each}
        <span class="chip" class:chip-empty={!result.parsedIntent.style}>
          <span class="chip-label">风格</span>
          {result.parsedIntent.style || '(未指定)'}
        </span>
      </div>
    </div>

    <!-- 2. 同品类资产对照（客观事实） -->
    <div class="card section">
      <div class="section-title">📊 同品类资产对照（事实数据，不评判）</div>

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
          <div class="fact-label">同品类爆品销量</div>
        </div>
        <div class="fact-item">
          <div class="fact-num">{result.assetComparison.competitorIntelCount}</div>
          <div class="fact-label">竞品情报</div>
        </div>
      </div>

      {#if result.assetComparison.topSeller}
        <div class="top-seller-row">
          🏆 <span class="muted">同品类爆品：</span>
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

    <!-- 3. 用户自选 4 象限（不评判，让人决策） -->
    <div class="card section">
      <div class="section-title">
        🎯 你来判定机会象限
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
            <div class="q-emoji">{opt.emoji}</div>
            <div class="q-label">{opt.label}</div>
            <div class="q-hint">{opt.hint}</div>
          </button>
        {/each}
      </div>
      {#if userQuadrant === ''}
        <div class="q-not-picked">未选 = 系统不替你打标签，可以一直留空</div>
      {/if}
    </div>

    <!-- 3. 模块匹配 -->
    <div class="card section">
      <div class="section-title">
        🧩 模块匹配（共 {result.totalMatchedModules} 条）
        {#if result.totalMatchedModules === 0}
          <span class="muted small">— 关键词太宽泛/太具体？试试调整输入</span>
        {/if}
      </div>

      {#each Object.entries(result.matchedModules) as [dim, mods] (dim)}
        <div class="module-dim">
          <div class="dim-header">
            <span class="pill pill-info">{dim}</span>
            <span class="muted small">命中 {mods.length} 条</span>
          </div>
          <div class="module-list">
            {#each mods as m (m.moduleId)}
              <div class="module-row">
                <code class="module-id">{m.moduleId}</code>
                <div class="module-body">
                  <div class="module-name">{m.moduleName}</div>
                  <div class="module-meta">
                    <span class="muted small">工厂 {m.factory}</span>
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
        </div>
      {/each}
    </div>

    <!-- 4. 概念卡草案 -->
    <div class="card concept-card">
      <div class="concept-header">
        <span class="concept-tag">📋 概念卡草案</span>
        <h2 class="concept-name">{result.conceptCardDraft.name}</h2>
      </div>
      <p class="concept-summary">{result.conceptCardDraft.summary}</p>
      <div class="concept-stats">
        <span class="pill pill-primary">{result.conceptCardDraft.moduleCount} 个匹配模块</span>
        {#if userQuadrant}
          {@const opt = QUADRANT_OPTIONS.find(o => o.key === userQuadrant)}
          {#if opt}
            <span class="pill {quadrantClass(userQuadrant)}">{opt.emoji} {opt.label}（你的判定）</span>
          {/if}
        {:else}
          <span class="pill pill-default">未选象限</span>
        {/if}
      </div>

      {#if result.conceptCardDraft.needsValidation.length > 0}
        <div class="needs-validation">
          <div class="nv-title">⚠️ 待补充/验证</div>
          {#each result.conceptCardDraft.needsValidation as v}
            <div class="nv-item">· {v}</div>
          {/each}
        </div>
      {/if}

      <div class="concept-actions">
        <button class="btn btn-primary" disabled>💾 保存概念卡（M5 实现）</button>
        <button class="btn btn-ghost" onclick={() => { result = null; text = ''; }}>↺ 重新输入</button>
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

  .input-area {
    padding: 20px;
  }
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
  .example-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

  /* Section */
  .section {
    margin-top: 14px;
  }
  .section-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
  .chip-empty {
    background: var(--gray-100);
    color: var(--gray-500);
    opacity: 0.7;
  }
  .chip-label {
    font-size: 10px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .chip-empty .chip-label {
    color: var(--gray-400);
  }

  /* === 事实数据展示（无评判） === */
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

  /* === 用户自选 4 象限 === */
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
  .q-option:hover {
    background: var(--gray-100);
    transform: translateY(-1px);
  }
  .q-option .q-emoji {
    font-size: 28px;
    margin-bottom: 4px;
  }
  .q-option .q-label {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--gray-700);
  }
  .q-option .q-hint {
    font-size: 10px;
    color: var(--gray-500);
    line-height: 1.4;
  }
  .q-option.q-selected {
    border-width: 2px;
    box-shadow: var(--shadow-md);
  }
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

  /* === 概念卡里的象限 pill 颜色 === */
  :global(.pill.q-star) { background: #fef3c7; color: #92400e; }
  :global(.pill.q-potential) { background: #dbeafe; color: #1d4ed8; }
  :global(.pill.q-red) { background: #fee2e2; color: #b91c1c; }
  :global(.pill.q-chicken) { background: #f3f4f6; color: var(--gray-500); }

  /* Module list */
  .module-dim {
    margin-bottom: 14px;
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
    grid-template-columns: 100px 1fr 180px;
    gap: 12px;
    align-items: center;
    padding: 10px 14px;
    background: var(--gray-50);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--primary);
    font-size: 13px;
  }
  .module-id {
    background: white;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    color: var(--gray-700);
  }
  .module-name {
    font-weight: 500;
    color: var(--gray-900);
    margin-bottom: 2px;
  }
  .module-meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .module-meta strong {
    color: var(--primary);
  }
  .module-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-end;
  }

  /* Concept card */
  .concept-card {
    margin-top: 14px;
    background: linear-gradient(135deg, white, #fafbff);
    border: 2px solid var(--primary-light);
    padding: 24px 28px;
  }
  .concept-header {
    margin-bottom: 12px;
  }
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
  .nv-title {
    font-weight: 600;
    color: #92400e;
    margin-bottom: 6px;
  }
  .nv-item {
    color: #78350f;
    line-height: 1.7;
  }
  .concept-actions {
    display: flex;
    gap: 8px;
  }

  .muted.small {
    font-size: 11px;
  }
</style>
