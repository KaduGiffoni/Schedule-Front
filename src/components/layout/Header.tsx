import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  Settings,
  Megaphone,
  ArrowRightLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usersService, type User } from "../../features/users/api/usersService";
import { noticesService } from "../../features/notices/api/noticesService"; // 👇 Importamos o serviço de avisos
import type { Notice } from "../../features/notices/types";

export const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); // 👇 Estado do menu do sininho

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null); // 👇 Ref para o sininho
  const navigate = useNavigate();

  const [userData, setUserData] = useState<User | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]); // 👇 Estado para os avisos ativos

  const loggedInEmail = localStorage.getItem("userEmail") || "";

  useEffect(() => {
    const fetchHeaderData = async () => {
      if (!loggedInEmail) return;
      try {
        // Busca os dados do usuário e do mural em paralelo
        const [user, board] = await Promise.all([
          usersService.getUserByEmail(loggedInEmail),
          noticesService.getMyBoard().catch(() => null), // Se falhar, retorna null temporariamente
        ]);

        setUserData(user);

        // 👇 Extração segura: garante que pegamos o array de dentro de .data
        if (board && board.data) {
          setNotices(board.data);
        } else {
          setNotices([]); // Fallback seguro para o array não ser undefined
        }
      } catch (error) {
        console.error("Erro ao carregar dados do Header", error);
        setNotices([]); // Garante que nunca fica undefined em caso de pane geral
      }
    };

    fetchHeaderData();

    const interval = setInterval(fetchHeaderData, 120000);
    return () => clearInterval(interval);
  }, [loggedInEmail]);

  // Fecha os menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setIsDropdownOpen(false);
    navigate("/");
  };

  const displayName = userData?.completeName
    ? `${userData.completeName} ${userData.surname || ""}`.trim()
    : "Carregando...";
  const displayRegistration = userData?.registration || "N/A";
  const initialLetter = userData?.completeName
    ? userData.completeName.charAt(0).toUpperCase()
    : "U";

  return (
    <header className="h-[72px] bg-white border-b border-[#e4e2e3] flex items-center justify-between px-8 shrink-0 z-20 relative">
      <div className="flex-1 max-w-[480px]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74777d]"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar turnos ou pessoal..."
            className="w-full h-10 pl-10 pr-4 bg-[#fbf9fa] border border-[#e4e2e3] rounded-[6px] text-[14px] focus:outline-none focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* 👇 NOVO: Componente do Sininho com Dropdown Real */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative p-2 rounded-full transition-colors ${isNotifOpen ? "bg-zinc-100 text-[#1b1c1d]" : "text-[#44474c] hover:text-[#1b1c1d]"}`}
          >
            <Bell size={20} />
            {notices.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#ba1a1a] text-white text-[9px] font-black rounded-full border border-white flex items-center justify-center animate-pulse">
                {notices.length}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white border border-[#e4e2e3] rounded-[8px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e4e2e3] flex justify-between items-center">
                <span className="text-[12px] font-bold text-[#041627] uppercase tracking-wider">
                  Alertas Operacionais
                </span>
                <span className="text-[10px] bg-zinc-200 text-zinc-700 font-bold px-1.5 py-0.5 rounded">
                  {notices.length} pendentes
                </span>
              </div>

              <div className="max-h-[280px] overflow-y-auto divide-y divide-[#efedef] custom-scrollbar">
                {notices.length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-[#74777d] italic">
                    Nenhuma pendência pendendo atenção no momento.
                  </div>
                ) : (
                  notices.map((n) => (
                    <Link
                      key={n.id}
                      to="/comunicacao"
                      onClick={() => setIsNotifOpen(false)}
                      className="p-4 flex gap-3 hover:bg-[#fbf9fa] transition-colors text-left block"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 
                        ${n.type === "Turno" ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600"}`}
                      >
                        {n.type === "Turno" ? (
                          <ArrowRightLeft size={14} />
                        ) : (
                          <Megaphone size={14} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#1b1c1d] truncate">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-[#74777d] mt-0.5 truncate">
                          Por @{n.createdByUserName}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <Link
                to="/comunicacao"
                onClick={() => setIsNotifOpen(false)}
                className="block text-center py-2.5 bg-[#f5f7fb] border-t border-[#e4e2e3] text-[12px] font-bold text-[#0058be] hover:bg-[#e0e7ff] transition-colors"
              >
                Ver tudo no painel
              </Link>
            </div>
          )}
        </div>

        {/* Área do Perfil */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-6 border-l border-[#e4e2e3] hover:bg-zinc-50 p-1.5 rounded-lg transition-colors cursor-pointer text-left"
          >
            <div>
              <p className="text-[14px] font-bold text-[#1b1c1d] leading-none">
                {displayName}
              </p>
              <p className="text-[12px] font-medium text-[#74777d] mt-1 uppercase tracking-wide">
                {displayRegistration}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold text-[14px] shadow-sm">
              {initialLetter}
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[220px] bg-white border border-[#e4e2e3] rounded-[8px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-1.5 animate-in fade-in slide-in-from-top-2 z-50">
              <div className="px-4 py-3 border-b border-[#e4e2e3] mb-1">
                <p className="text-[13px] font-bold text-[#1b1c1d] truncate">
                  {loggedInEmail || "Usuário não identificado"}
                </p>
                <p className="text-[11px] text-[#74777d]">Acesso Autorizado</p>
              </div>

              <Link
                to="/perfil"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold text-[#44474c] hover:bg-[#fbf9fa] hover:text-[#0058be] transition-colors"
              >
                <UserIcon size={16} /> Meu Perfil
              </Link>

              <Link
                to="/configuracoes"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold text-[#44474c] hover:bg-[#fbf9fa] hover:text-[#0058be] transition-colors"
              >
                <Settings size={16} /> Configurações
              </Link>

              <div className="h-px bg-[#e4e2e3] my-1.5"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold text-[#ba1a1a] hover:bg-[#fff0f0] transition-colors"
              >
                <LogOut size={16} /> Encerrar Sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
