import React from "react";
import { useLocation, Link } from "react-router-dom"; // 👇 Importamos o Link e o useLocation
import {
  LayoutDashboard,
  Calendar,
  ArrowLeftRight,
  ShieldAlert,
  Settings,
  HelpCircle,
  Users,
} from "lucide-react";

export const Sidebar = () => {
  // 👇 Pega a URL atual onde o usuário está (ex: '/users' ou '/dashboard')
  const location = useLocation();

  // Mock da permissão
  const userRole = "Admin";
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

  // 👇 Agora cada item tem um 'path' que diz para onde ele deve ir
  const menuItems = [
    { icon: LayoutDashboard, label: "PAINEL", path: "/dashboard" },
    ...(isAdminOrManager
      ? [{ icon: Users, label: "USUÁRIOS", path: "/users" }]
      : []),
  ];

  return (
    <aside className="w-[260px] h-screen bg-[#fbf9fa] border-r border-[#efedef] flex flex-col shrink-0">
      {/* Logo Area */}
      <div className="p-6">
        <h1 className="text-[18px] font-bold text-[#041627] leading-tight">
          Operações
          <br />
          Industriais
        </h1>
        <p className="text-[12px] font-semibold text-[#74777d] mt-2 uppercase tracking-wider">
          Gestão de Turnos
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6">
        {menuItems.map((item, index) => {
          // 👇 A MÁGICA: Se a URL atual for igual ao caminho do botão, ele fica ativo!
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-4 text-[14px] font-medium transition-colors border-l-4 
              ${
                isActive
                  ? "border-[#0058be] text-[#0058be] bg-[#0058be]/5"
                  : "border-transparent text-[#44474c] hover:bg-[#efedef] hover:text-[#1b1c1d]"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-4 border-t border-[#efedef] flex flex-col gap-2">
        <Link
          to="/configuracoes"
          className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-[#44474c] hover:bg-[#efedef] hover:text-[#1b1c1d] rounded-[4px]"
        >
          <Settings size={20} /> CONFIGURAÇÕES
        </Link>
        <Link
          to="/suporte"
          className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-[#44474c] hover:bg-[#efedef] hover:text-[#1b1c1d] rounded-[4px]"
        >
          <HelpCircle size={20} /> SUPORTE
        </Link>
      </div>
    </aside>
  );
};
