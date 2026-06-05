/**
 * 全局鉴权状态 + 工具
 *
 * Svelte 5 跨 .svelte 文件共享 $state 需要文件名带 .svelte.ts
 * 用法：
 *   import { authState, refreshMe, doLogin, doLogout } from '../lib/auth.svelte';
 *   {#if authState.user} ... {/if}
 */
import axios from 'axios';
import { navigate } from 'svelte-routing';

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
});

interface AuthState {
  user: string | null;
  loading: boolean;
  initialized: boolean;
}

export const authState = $state<AuthState>({
  user: null,
  loading: false,
  initialized: false,
});

/** 启动时检查会话；返回当前用户名或 null */
export async function refreshMe(): Promise<string | null> {
  try {
    const r = await http.get<{ username: string }>('/auth/me');
    authState.user = r.data.username;
    return r.data.username;
  } catch {
    authState.user = null;
    return null;
  } finally {
    authState.initialized = true;
  }
}

export async function doLogin(username: string, password: string): Promise<void> {
  authState.loading = true;
  try {
    const r = await http.post<{ ok: boolean; username: string }>('/auth/login', {
      username,
      password,
    });
    authState.user = r.data.username;
  } finally {
    authState.loading = false;
  }
}

export async function doRegister(
  username: string,
  password: string,
  activationCode: string,
): Promise<void> {
  authState.loading = true;
  try {
    const r = await http.post<{ ok: boolean; username: string }>('/auth/register', {
      username,
      password,
      activationCode,
    });
    authState.user = r.data.username;
  } finally {
    authState.loading = false;
  }
}

export async function doLogout(): Promise<void> {
  try {
    await http.post('/auth/logout');
  } finally {
    authState.user = null;
    navigate('/login', { replace: true });
  }
}
