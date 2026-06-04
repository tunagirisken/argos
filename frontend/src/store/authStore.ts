import { create } from "zustand";
import { api } from "../services/api";

/** Eski argos.token anahtarı artık okunmaz — giriş ekranı zorunlu */
const TOKEN_KEY = "argos.session";

function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

function writeToken(token: string, remember: boolean) {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (remember) localStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export interface AuthUser {
  username: string;
  is_admin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  setSession: (token: string, user: AuthUser, remember?: boolean) => void;
  clearSession: () => void;
  restore: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setSession: (token, user, remember = false) => {
    writeToken(token, remember);
    set({ user, ready: true });
  },
  clearSession: () => {
    clearToken();
    set({ user: null, ready: true });
  },
  restore: async () => {
    const token = readToken();
    if (!token) {
      set({ user: null, ready: true });
      return;
    }
    try {
      const me = await api.authMe();
      set({ user: me, ready: true });
    } catch {
      clearToken();
      set({ user: null, ready: true });
    }
  },
  logout: () => {
    clearToken();
    set({ user: null });
    api.authLogout().catch(() => {});
  },
}));

export function getAuthToken(): string | null {
  return readToken();
}
