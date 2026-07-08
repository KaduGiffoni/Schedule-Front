import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { authService } from "../api/authService";

export const ProtectedRoute = () => {

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const rolesLoaded = useAuthStore((state) => state.rolesLoaded);
  const setRoles = useAuthStore((state) => state.setRoles);

  // Busca as roles do usuário logado (GET /api/Auth/me) uma vez por sessão.
  // Necessário porque o token do backend é opaco e não carrega as roles "dentro"
  // dele — ver o comentário em authStore.ts.
  useEffect(() => {
    if (isAuthenticated && !rolesLoaded) {
      authService
        .getMe()
        .then((me) => setRoles(me.roles))
        .catch(() => setRoles([])); // se falhar, trata como usuário sem roles especiais
    }
  }, [isAuthenticated, rolesLoaded, setRoles]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};