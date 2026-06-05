<script lang="ts">
  import { onMount } from 'svelte';
  import { Router, Route, Link, navigate } from 'svelte-routing';
  import Cockpit from './routes/Cockpit.svelte';
  import Query from './routes/Query.svelte';
  import Compose from './routes/Compose.svelte';
  import Concepts from './routes/Concepts.svelte';
  import CategoryMap from './routes/CategoryMap.svelte';
  import Underperform from './routes/Underperform.svelte';
  import Login from './routes/Login.svelte';
  import Register from './routes/Register.svelte';
  import Icon from './lib/Icon.svelte';
  import { authState, refreshMe, doLogout } from './lib/auth.svelte';

  let { url = '' } = $props();

  onMount(async () => {
    await refreshMe();
    const path = window.location.pathname;
    const isPublic = path === '/login' || path === '/register';
    if (!authState.user && !isPublic) {
      const params = new URLSearchParams({ next: path + window.location.search });
      navigate(`/login?${params.toString()}`, { replace: true });
    }
  });

  $effect(() => {
    if (authState.initialized && authState.user) {
      const path = window.location.pathname;
      if (path === '/login' || path === '/register') {
        navigate('/', { replace: true });
      }
    }
  });
</script>

<Router {url}>
  {#if !authState.initialized}
    <div class="boot">
      <Icon name="loader-2" size={20} class="spin" /> 加载中…
    </div>
  {:else if !authState.user}
    <main class="auth-main">
      <Route path="/register"><Register /></Route>
      <Route path="/login"><Login /></Route>
      <Route path="/*"><Login /></Route>
    </main>
  {:else}
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <span class="logo"><Icon name="puzzle" size={22} /></span>
          <span class="title">产品组合器</span>
          <span class="version">v1 · 内测</span>
        </div>
        <nav class="nav">
          <Link to="/" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>
            <Icon name="home" size={15} /><span>驾驶舱</span>
          </Link>
          <Link to="/compose" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>
            <Icon name="sparkles" size={15} /><span>组合器</span>
          </Link>
          <Link to="/concepts" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>
            <Icon name="clipboard-list" size={15} /><span>概念卡</span>
          </Link>
          <Link to="/category-map" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>
            <Icon name="map" size={15} /><span>品类地图</span>
          </Link>
          <Link to="/underperform" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>
            <Icon name="alert-triangle" size={15} /><span>未起量</span>
          </Link>
          <Link to="/query" getProps={({ isCurrent }) => ({ class: isCurrent ? 'nav-link active' : 'nav-link' })}>
            <Icon name="search" size={15} /><span>查询中心</span>
          </Link>
        </nav>
        <div class="user-box">
          <span class="user-name"><Icon name="user" size={14} /> {authState.user}</span>
          <button class="logout" onclick={doLogout} aria-label="退出登录">
            <Icon name="log-out" size={13} /> 退出
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <Route path="/"><Cockpit /></Route>
      <Route path="/compose"><Compose /></Route>
      <Route path="/concepts"><Concepts /></Route>
      <Route path="/category-map"><CategoryMap /></Route>
      <Route path="/underperform"><Underperform /></Route>
      <Route path="/query"><Query /></Route>
    </main>
  {/if}
</Router>

<style>
  .boot {
    text-align: center;
    padding: 80px 20px;
    color: var(--gray-500);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .auth-main {
    min-height: 100vh;
  }
  .app-header {
    background: white;
    border-bottom: 1px solid var(--border);
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
    gap: 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .logo {
    display: inline-flex;
    align-items: center;
    color: var(--primary);
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
    gap: 4px;
    flex: 1;
    justify-content: center;
  }
  :global(.nav-link) {
    color: var(--gray-700);
    text-decoration: none;
    padding: 7px 12px;
    border-radius: var(--radius-md);
    font-size: 13.5px;
    font-weight: 500;
    transition: background var(--t-fast), color var(--t-fast);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  :global(.nav-link:hover) {
    background: var(--gray-100);
  }
  :global(.nav-link.active) {
    background: var(--primary-light);
    color: var(--primary);
  }
  :global(.nav-link svg) { flex-shrink: 0; }
  .user-box {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .user-name {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--gray-700);
    font-weight: 500;
  }
  .logout {
    background: var(--gray-100);
    color: var(--gray-700);
    border: 0;
    border-radius: var(--radius-md);
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: background var(--t-fast), color var(--t-fast);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: inherit;
  }
  .logout:hover {
    background: var(--gray-200);
    color: var(--danger);
  }
  .app-main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
  }
</style>
