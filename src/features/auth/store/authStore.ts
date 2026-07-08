import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types';

// ── Tipos do store ────────────────────────────────────────────────────────────
interface AuthState {
  token: string | null;
  email: string | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  /**
   * Roles do usuário logado (ex: ["Admin"], ["Manager", "Standard"]).
   * IMPORTANTE: o token emitido pelo backend (MapIdentityApi) é opaco — não é um
   * JWT decodificável no navegador. Por isso as roles NÃO vêm de dentro do token;
   * elas são buscadas separadamente via GET /api/Auth/me (ver setRoles abaixo) e
   * authService.getMe(). Nunca tente extrair roles decodificando `token`.
   */
  roles: string[];
  /** true assim que já tentamos buscar as roles em /api/Auth/me pelo menos uma vez */
  rolesLoaded: boolean;

  setTokenAndEmail: (token: string, email: string) => void;
  setUserProfile: (profile: UserProfile) => void;
  setRoles: (roles: string[]) => void;
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
      rolesLoaded: false,

      setTokenAndEmail: (token, email) => {
        // Roles são resetadas aqui — quem popula de verdade é setRoles(),
        // chamado depois de consultar GET /api/Auth/me.
        set({ token, email, isAuthenticated: true, roles: [], rolesLoaded: false });
      },

      setUserProfile: (userProfile) => set({ userProfile }),

      setRoles: (roles) => set({ roles, rolesLoaded: true }),

      logout: () => set({
        token: null,
        email: null,
        userProfile: null,
        isAuthenticated: false,
        roles: [],
        rolesLoaded: false,
      }),
    }),
    {
      name: '@WorkforcePro:auth',
    }
  )
);