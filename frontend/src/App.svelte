<script lang="ts">
  import { Router, Route, Link } from 'svelte-routing';
  import Cockpit from './routes/Cockpit.svelte';
  import Query from './routes/Query.svelte';
  import Compose from './routes/Compose.svelte';
  import CategoryMap from './routes/CategoryMap.svelte';
  import Underperform from './routes/Underperform.svelte';

  // svelte-routing 顶层 url（用于服务端渲染时传入，浏览器端可留空）
  let { url = '' } = $props();
</script>

<Router {url}>
  <header class="app-header">
    <div class="header-inner">
      <div class="brand">
        <span class="logo">🧩</span>
        <span class="title">产品组合器</span>
        <span class="version">v1 · M1</span>
      </div>
      <nav class="nav">
        <Link to="/" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>🏠 驾驶舱</Link>
        <Link to="/compose" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>✨ 组合器</Link>
        <Link to="/category-map" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>🗺️ 品类地图</Link>
        <Link to="/underperform" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>⚠️ 未起量</Link>
        <Link to="/query" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>🔍 查询中心</Link>
      </nav>
    </div>
  </header>

  <main class="app-main">
    <Route path="/"><Cockpit /></Route>
    <Route path="/compose"><Compose /></Route>
    <Route path="/category-map"><CategoryMap /></Route>
    <Route path="/underperform"><Underperform /></Route>
    <Route path="/query"><Query /></Route>
  </main>
</Router>

<style>
  .app-header {
    background: white;
    border-bottom: 1px solid var(--gray-200);
    box-shadow: var(--shadow-sm);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo {
    font-size: 22px;
  }
  .title {
    font-size: 17px;
    font-weight: 700;
    background: var(--gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .version {
    font-size: 11px;
    color: var(--gray-500);
    background: var(--gray-100);
    padding: 2px 8px;
    border-radius: 100px;
    font-family: var(--font-mono);
  }
  .nav {
    display: flex;
    gap: 6px;
  }
  :global(.nav-link) {
    color: var(--gray-700);
    text-decoration: none;
    padding: 8px 14px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s;
  }
  :global(.nav-link:hover) {
    background: var(--gray-100);
  }
  :global(.nav-link.active) {
    background: var(--primary-light);
    color: var(--primary);
  }
  .app-main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
  }
</style>
