import React from 'react';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore'; // 👇 Importamos o cofre

export const Header = () => {
  // 👇 Lemos o perfil completo que o DashboardLayout acabou de guardar lá!
  const userProfile = useAuthStore((state) => state.userProfile);

  return (
    <header className="h-[72px] bg-white border-b border-[#efedef] flex items-center justify-between px-8">
      {/* Search Bar */}
      <div className="w-[400px] h-[40px] bg-[#fbf9fa] border border-[#efedef] rounded-[4px] flex items-center px-3">
        <Search size={18} className="text-[#74777d] mr-2" />
        <input 
          type="text" 
          placeholder="Buscar turnos ou pessoal..." 
          className="bg-transparent border-none outline-none text-[14px] w-full text-[#1b1c1d]"
        />
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-6">
        <button className="relative text-[#44474c] hover:text-[#1b1c1d] transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ba1a1a] rounded-full"></span>
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            {/* 👇 Mostramos o nome real que veio do C#, ou "A carregar..." se a internet estiver lenta */}
            <p className="text-[14px] font-bold text-[#1b1c1d]">
              {userProfile ? userProfile.completeName : 'A carregar...'}
            </p>
            {/* 👇 Mostramos a matrícula/cargo que veio do C# */}
            <p className="text-[12px] text-[#74777d] uppercase font-semibold">
              {userProfile ? userProfile.registration : 'GERENTE DE TURNO'}
            </p>
          </div>
          
          <div className="w-10 h-10 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold overflow-hidden border border-[#e4e2e3]">
             {/* Se quiser, podemos colocar a primeira letra do nome do utilizador aqui em vez de uma imagem fixa */}
             {userProfile ? userProfile.completeName.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};