import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useThemeStore } from "./lib/theme";
import { ToastContainer } from "./components/ui/Toast";

// Páginas e layouts
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import DashboardPage from "./features/dashboard/pages/DashboardPage";
import UsersPage from "./features/users/pages/UsersPage";
import SettingsPage from "./features/settings/pages/SettingsPage";
import ProfilePage from "./features/profile/pages/ProfilePage";
import NoticesPage from "./features/notices/pages/NoticesPage";
import AbsencesPage from "./features/absences/pages/AbsencesPage";
import SwapRequestsPage from "./features/swap-requests/pages/SwapRequestsPage";
import AdminPage from "./features/admin/pages/AdminPage";
import HomePage from "./features/home/page/HomePage";

import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

/**
 * ThemeInitializer: garante que o tema do Zustand está sincronizado
 * com o DOM após a hidratação. Roda uma única vez.
 */
function ThemeInitializer() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Sincroniza tema após hidratação do Zustand */}
      <ThemeInitializer />
      {/* Sistema de toasts — global, sobreposto a tudo */}
      <ToastContainer />

      <Routes>
        {/* ── Rotas públicas ─────────────────────────────── */}
        <Route path="/"          element={<LoginPage />} />
        <Route path="/register"  element={<RegisterPage />} />

        {/* ── Rotas protegidas ───────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/home"            element={<HomePage />} />
            <Route path="/dashboard"       element={<DashboardPage />} />
            <Route path="/comunicacao"     element={<NoticesPage />} />
            <Route path="/users"           element={<UsersPage />} />
            <Route path="/ausencias"       element={<AbsencesPage />} />
            <Route path="/trocas"          element={<SwapRequestsPage />} />
            <Route path="/administracao"   element={<AdminPage />} />
            <Route path="/configuracoes"   element={<SettingsPage />} />
            <Route path="/perfil"          element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
