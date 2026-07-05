import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import type { UserProfile } from '../types';

// ── Extração de roles do JWT ──────────────────────────────────────────────────
// O ASP.NET Identity pode emitir a claim de role com dois nomes distintos:
const ROLE_CLAIM_SHORT = 'role';
const ROLE_CLAIM_LONG  = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function extractRoles(token: string): string[] {
  try {
    const payload = jwtDecode<Record<string, unknown>>(token);
    const raw = payload[ROLE_CLAIM_SHORT] ?? payload[ROLE_CLAIM_LONG];
    if (!raw) return [];
    // Pode vir como string única ou como array de strings
    if (Array.isArray(raw)) return raw.map(String);
    return [String(raw)];
  } catch {
    return [];
  }
}

// ── Tipos do store ────────────────────────────────────────────────────────────
interface AuthState {
  token: string | null;
  email: string | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  /** Roles extraídas do JWT (ex: ["Admin"], ["Manager", "Standard"]) */
  roles: string[];

  setTokenAndEmail: (token: string, email: string) => void;
  setUserProfile: (profile: UserProfile) => void;
  logout: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      userProfile: null,
      isAuthenticated: false,
      roles: [],

      setTokenAndEmail: (token, email) => {
        const roles = extractRoles(token);
        set({ token, email, isAuthenticated: true, roles });
      },

      setUserProfile: (userProfile) => set({ userProfile }),

      logout: () => set({
        token: null,
        email: null,
        userProfile: null,
        isAuthenticated: false,
        roles: [],
      }),
    }),
    {
      name: '@WorkforcePro:auth',
    }
  )
);