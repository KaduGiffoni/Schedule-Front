import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// 👇 Importamos o cofre e o serviço da API
import { useAuthStore } from '../../features/auth/store/authStore';
import { userService } from '../../features/auth/api/userService';

export const DashboardLayout = () => {
  // Puxamos o email guardado e a função para guardar o perfil
  const email = useAuthStore((state) => state.email);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);

  // O useEffect roda automaticamente quando este Layout aparece no ecrã
  useEffect(() => {
    const carregarPerfil = async () => {
      if (email) {
        try {
          // Vamos à API do C# procurar os dados do utilizador!
          const perfilReal = await userService.getUserProfile(email);
          // Guardamos o resultado no nosso cofre
          setUserProfile(perfilReal);
        } catch (error) {
          console.error("Falha ao carregar os dados do utilizador", error);
        }
      }
    };

    carregarPerfil();
  }, [email, setUserProfile]); // Se o email mudar, ele roda de novo

  return (
    <div className="flex h-screen bg-[#ffffff] font-sans text-[#1b1c1d] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-hidden bg-white">
          <Outlet />
        </div>
      </div>
    </div>
  );
};