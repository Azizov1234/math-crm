import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'SUPERADMIN' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  status?: string;
  lastLoginAt?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken?: string | null) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, token, refreshToken = null) => set({ user, token, refreshToken, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    { name: 'crm-auth-v2' }
  )
);

