import { useAuthStore } from '../features/auth/store/authStore';

/**
 * Retorna `true` se o usuário logado tiver pelo menos uma das roles passadas.
 *
 * @example
 * const canManage = useHasRole('Admin', 'Manager');
 * const isAdmin   = useHasRole('Admin');
 */
export function useHasRole(...allowedRoles: string[]): boolean {
  const roles = useAuthStore((s) => s.roles);
  return allowedRoles.some((r) => roles.includes(r));
}

/**
 * Versão não-reativa (para usar fora de componentes React, ex: em guards de rota).
 * Lê diretamente do store sem criar uma subscription.
 */
export function hasRole(...allowedRoles: string[]): boolean {
  const roles = useAuthStore.getState().roles;
  return allowedRoles.some((r) => roles.includes(r));
}
