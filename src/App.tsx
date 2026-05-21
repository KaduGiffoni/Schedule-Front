import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importar as páginas e layouts
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import DashboardPage from "./features/dashboard/pages/DashboardPage";
import UsersPage from "./features/users/pages/UsersPage";
import SettingsPage from "./features/settings/pages/SettingsPage";
import ProfilePage from "./features/profile/pages/ProfilePage";

import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";
import NoticesPage from "./features/notices/pages/NoticesPage";
import { Home } from "lucide-react";
import DashboardHome from "./features/home/page/HomePage";
import HomePage from "./features/home/page/HomePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================== */}
        {/* ROTAS PÚBLICAS (Acesso sem login)          */}
        {/* ========================================== */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ========================================== */}
        {/* ROTAS PRIVADAS (Exigem login)              */}
        {/* ========================================== */}
        <Route element={<ProtectedRoute />}>
          {/* Tudo o que está aqui dentro ganha Sidebar e Header automaticamente! */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/comunicacao" element={<NoticesPage />} />
            <Route path="/home" element={<HomePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
