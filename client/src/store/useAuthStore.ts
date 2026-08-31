import { create } from 'zustand';
import type { LoginData, RegisterData, User } from '../types/user';
import {
  authApi,
  getStoredToken,
  removeStoredToken,
  setStoredToken,
} from '../utils/api';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      removeStoredToken();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  register: async (data) => {
    set({ error: null });
    try {
      const { token, user } = await authApi.register(data);
      setStoredToken(token);
      set({ user, isAuthenticated: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      set({ error: message });
      throw err;
    }
  },

  login: async (data) => {
    set({ error: null });
    try {
      const { token, user } = await authApi.login(data);
      setStoredToken(token);
      set({ user, isAuthenticated: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '로그인에 실패했습니다.';
      set({ error: message });
      throw err;
    }
  },

  logout: () => {
    removeStoredToken();
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
