import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuthStore } from "../../features/auth/store/authStore";
import { userService } from "../../features/auth/api/userService";
import { useTheme } from "../../lib/theme";

export const DashboardLayout = () => {
  const email = useAuthStore((state) => state.email);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);

  // Inicializa o tema (sincroniza com DOM)
  useTheme();

  // Carrega o perfil do usuário uma única vez
  useEffect(() => {
    if (!email) return;

    const carregarPerfil = async () => {
      try {
        const perfilReal = await userService.getUserProfile(email);
        setUserProfile(perfilReal);
      } catch (error) {
        console.error("Falha ao carregar dados do utilizador", error);
      }
    };

    carregarPerfil();
  }, [email, setUserProfile]);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main
          className="flex-1 overflow-hidden"
          style={{ backgroundColor: "var(--color-bg)" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};