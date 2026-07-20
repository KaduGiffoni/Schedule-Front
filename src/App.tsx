import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useThemeStore } from "./lib/theme";
import { ToastContainer } from "./components/ui/Toast";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

// FIX: 10 — Lazy loading de páginas
const LoginPage = React.lazy(() => import("./features/auth/pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./features/auth/pages/RegisterPage"));
const DashboardPage = React.lazy(() => import("./features/dashboard/pages/DashboardPage"));
const UsersPage = React.lazy(() => import("./features/users/pages/UsersPage"));
const SettingsPage = React.lazy(() => import("./features/settings/pages/SettingsPage"));
const ProfilePage = React.lazy(() => import("./features/profile/pages/ProfilePage"));
const NoticesPage = React.lazy(() => import("./features/notices/pages/NoticesPage"));
const AbsencesPage = React.lazy(() => import("./features/absences/pages/AbsencesPage"));
const SwapRequestsPage = React.lazy(() => import("./features/swap-requests/pages/SwapRequestsPage"));
const KnowledgeBasePage = React.lazy(() => import("./features/knowledge-base/pages/KnowledgeBasePage"));
const ArticleViewPage = React.lazy(() => import("./features/knowledge-base/pages/ArticleViewPage"));
const ArticleEditorPage = React.lazy(() => import("./features/knowledge-base/pages/ArticleEditorPage"));
const ArticleHistoryPage = React.lazy(() => import("./features/knowledge-base/pages/ArticleHistoryPage"));
const KnowledgeBaseSettingsPage = React.lazy(() => import("./features/knowledge-base/pages/KnowledgeBaseSettingsPage"));
const AdminPage = React.lazy(() => import("./features/admin/pages/AdminPage"));
const HomePage = React.lazy(() => import("./features/home/page/HomePage"));

// Fallback do Suspense
const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg)]">
    <Loader2 size={32} className="animate-spin text-[var(--color-accent)] mb-4" />
    <span className="text-sm font-medium text-[var(--color-text-faint)]">Carregando...</span>
  </div>
);

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
    <ErrorBoundary>
      <BrowserRouter>
        {/* Sincroniza tema após hidratação do Zustand */}
        <ThemeInitializer />
        {/* Sistema de toasts — global, sobreposto a tudo */}
        <ToastContainer />

        <Suspense fallback={<PageLoader />}>
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
                <Route path="/base-conhecimento" element={<KnowledgeBasePage />} />
                <Route path="/base-conhecimento/novo" element={<ArticleEditorPage />} />
                <Route path="/base-conhecimento/:id" element={<ArticleViewPage />} />
                <Route path="/base-conhecimento/:id/historico" element={<ArticleHistoryPage />} />
                <Route path="/base-conhecimento/:id/editar" element={<ArticleEditorPage />} />
                <Route path="/base-conhecimento/configuracoes" element={<KnowledgeBaseSettingsPage />} />
                <Route path="/administracao"   element={<AdminPage />} />
                <Route path="/configuracoes"   element={<SettingsPage />} />
                <Route path="/perfil"          element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
