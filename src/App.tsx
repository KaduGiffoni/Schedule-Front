import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importar as páginas e layouts
import LoginPage from "./features/auth/pages/LoginPage";
import DashboardPage from "./features/dashboard/pages/DashboardPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";
import RegisterPage from "./features/auth/pages/RegisterPage";
import UsersPage from "./features/users/pages/UsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública: Tela de Login */}
        <Route path="/" element={<LoginPage />} />

        {/* Rotas Privadas: Envolvidas no DashboardLayout.
          Tudo o que estiver aqui dentro vai ter a Sidebar e o Header 
          automaticamente!
        */}

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Route>

        {/* Rota de fallback (404) - Se o utilizador digitar um URL que não existe */}
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Routes>
    </BrowserRouter>
  );
}
