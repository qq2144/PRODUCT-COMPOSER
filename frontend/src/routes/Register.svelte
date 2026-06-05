<script lang="ts">
  import { onMount } from 'svelte';
  import { Link, navigate } from 'svelte-routing';
  import { doRegister, authState } from '../lib/auth.svelte';
  import Icon from '../lib/Icon.svelte';

  let username = $state('');
  let password = $state('');
  let password2 = $state('');
  let activationCode = $state('');
  let error = $state<string | null>(null);

  onMount(() => {
    if (authState.user) navigate('/', { replace: true });
  });

  async function submit() {
    error = null;
    if (!username || !password || !activationCode) {
      error = '所有字段都需要填';
      return;
    }
    if (password.length < 6) {
      error = '密码至少 6 位';
      return;
    }
    if (password !== password2) {
      error = '两次密码不一致';
      return;
    }
    try {
      await doRegister(username, password, activationCode);
      navigate('/', { replace: true });
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      error = msg ?? '注册失败';
    }
  }
</script>

<div class="auth-page">
  <form class="auth-card" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="brand">
      <span class="logo"><Icon name="puzzle" size={26} /></span>
      <span class="title">产品组合器</span>
    </div>
    <h2>注册账号</h2>
    <p class="hint">内部工具 · 需激活码 · 4 人内测</p>

    <label>
      <span>用户名</span>
      <div class="input-with-icon">
        <Icon name="user" size={15} class="ipic" />
        <input
          type="text"
          bind:value={username}
          autocomplete="username"
          autofocus
          placeholder="字母/数字/中文，2-40 字"
        />
      </div>
    </label>
    <label>
      <span>密码</span>
      <div class="input-with-icon">
        <Icon name="lock" size={15} class="ipic" />
        <input
          type="password"
          bind:value={password}
          autocomplete="new-password"
          placeholder="≥ 6 位"
        />
      </div>
    </label>
    <label>
      <span>再输一次密码</span>
      <div class="input-with-icon">
        <Icon name="lock" size={15} class="ipic" />
        <input
          type="password"
          bind:value={password2}
          autocomplete="new-password"
        />
      </div>
    </label>
    <label>
      <span>激活码</span>
      <div class="input-with-icon">
        <Icon name="key-round" size={15} class="ipic" />
        <input
          type="text"
          bind:value={activationCode}
          placeholder="联系开发者周宣辰"
        />
      </div>
    </label>

    {#if error}
      <div class="err"><Icon name="alert-circle" size={14} /> {error}</div>
    {/if}

    <button type="submit" disabled={authState.loading}>
      {#if authState.loading}<Icon name="loader-2" size={15} class="spin" /> 注册中…{:else}注册并登录{/if}
    </button>

    <div class="alt">
      已有账号？<Link to="/login">直接登录</Link>
    </div>
  </form>
</div>

<style>
  .auth-page {
    min-height: calc(100vh - 0px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .auth-card {
    background: white;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: 36px 40px;
    width: 380px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .logo { font-size: 24px; }
  .title {
    font-size: 18px;
    font-weight: 700;
    background: var(--gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  h2 {
    font-size: 22px;
    margin: 0;
    color: var(--gray-900);
  }
  .hint {
    margin: 0 0 4px;
    color: var(--gray-500);
    font-size: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  label span {
    font-size: 12px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }
  :global(.input-with-icon .ipic) {
    position: absolute;
    left: 12px;
    color: var(--gray-400);
    pointer-events: none;
  }
  input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-family: inherit;
    background: white;
    transition: border-color var(--t-fast), box-shadow var(--t-fast);
  }
  input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: var(--ring);
  }
  .err {
    color: var(--danger);
    font-size: 13px;
    background: #fef2f2;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  button {
    background: var(--gradient);
    color: white;
    border: 0;
    border-radius: var(--radius-md);
    padding: 11px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity var(--t-fast), transform var(--t-fast), box-shadow var(--t-fast);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
  }
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  button:focus-visible { outline: none; box-shadow: var(--ring); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .alt {
    font-size: 13px;
    color: var(--gray-500);
    text-align: center;
  }
  :global(.alt a) {
    color: var(--primary);
    text-decoration: none;
  }
  :global(.alt a:hover) { text-decoration: underline; }
</style>
