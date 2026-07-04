import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  Settings,
  Megaphone,
  ArrowRightLeft,
  Sun,
  Moon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";
import { useTheme } from "../../lib/theme";
import { noticesService } from "../../features/notices/api/noticesService";
import type { Notice } from "../../features/notices/types";

// ── Subcomponente: Dropdown com animação CSS ──────────────────────────────────
interface DropdownProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

const Dropdown = ({ isOpen, children, className = "" }: DropdownProps) => (
  <div
    className={`absolute right-0 top-[calc(100%+8px)] z-[var(--z-dropdown)] ${className}`}
    style={{
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
      pointerEvents: isOpen ? "auto" : "none",
      transition: isOpen
        ? "opacity 150ms var(--ease-out-expo), transform 150ms var(--ease-out-expo)"
        : "opacity 100ms ease-in, transform 100ms ease-in",
      transformOrigin: "top right",
    }}
  >
    {children}
  </div>
);

// ── Header principal ──────────────────────────────────────────────────────────
export const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { theme, toggleTheme, isDark } = useTheme();

  // Dados do usuário via AuthStore (DashboardLayout já faz o fetch)
  const userProfile = useAuthStore((state) => state.userProfile);
  const email = useAuthStore((state) => state.email);

  const displayName = userProfile?.completeName ?? email ?? "Operador";
  const displayRegistration = userProfile?.registration ?? "";
  const initialLetter = (userProfile?.completeName ?? email ?? "O")
    .charAt(0)
    .toUpperCase();

  // Fetch de notificações (independente dos dados de usuário)
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const board = await noticesService.getMyBoard().catch(() => null);
        setNotices(board?.data ?? []);
      } catch {
        setNotices([]);
      }
    };

    fetchNotices();
    const interval = setInterval(fetchNotices, 120_000);
    return () => clearInterval(interval);
  }, []);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    useAuthStore.getState().logout?.();
    setIsDropdownOpen(false);
    navigate("/");
  }, [navigate]);

  const iconBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    transition: "background-color 120ms ease-out, color 120ms ease-out",
  };

  return (
    <header
      className="h-[60px] flex items-center justify-between px-5 shrink-0 relative z-[var(--z-sticky)]"
      style={{
        backgroundColor: "var(--color-header-bg)",
        borderBottom: "1px solid var(--color-header-border)",
      }}
    >
      {/* ── Campo de busca ─────────────────────────────────────────── */}
      <div className="flex-1 max-w-[400px]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            size={15}
            style={{ color: "var(--color-text-faint)" }}
          />
          <input
            type="search"
            placeholder="Buscar turnos ou pessoal..."
            className="w-full h-9 pl-9 pr-4 text-[13px] rounded-[6px]"
            style={{
              backgroundColor: "var(--color-surface-dim)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              outline: "none",
              transition: "border-color 150ms ease-out, box-shadow 150ms ease-out",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-accent)";
              e.target.style.boxShadow = "0 0 0 3px var(--color-accent-dim)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* ── Ações direita ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Toggle de tema */}
        <button
          onClick={toggleTheme}
          style={iconBtnStyle}
          title={isDark ? "Alternar para modo claro" : "Alternar para modo escuro"}
          aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
          }}
        >
          {isDark ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
        </button>

        {/* ── Sino de notificações ──────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            id="header-notifications-btn"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            aria-expanded={isNotifOpen}
            aria-haspopup="true"
            style={{
              ...iconBtnStyle,
              backgroundColor: isNotifOpen ? "var(--color-surface-raised)" : "transparent",
              color: isNotifOpen ? "var(--color-text)" : "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => {
              if (!isNotifOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isNotifOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
              }
            }}
          >
            <Bell size={17} strokeWidth={1.8} />
            {/* Badge estático — sem pulse (Emil: não animar elementos de alta frequência) */}
            {notices.length > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full border-2"
                style={{
                  backgroundColor: "var(--color-error)",
                  borderColor: "var(--color-header-bg)",
                }}
              />
            )}
          </button>

          {/* Dropdown de notificações */}
          <Dropdown isOpen={isNotifOpen} className="w-[300px]">
            <div
              className="rounded-[10px] overflow-hidden"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-dropdown)",
              }}
            >
              {/* Header do dropdown */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
              >
                <span
                  className="text-[12px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Alertas Operacionais
                </span>
                {notices.length > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]"
                    style={{
                      backgroundColor: "var(--color-accent-dim)",
                      color: "var(--color-accent-text)",
                    }}
                  >
                    {notices.length}
                  </span>
                )}
              </div>

              {/* Lista de notificações */}
              <div className="max-h-[260px] overflow-y-auto divide-y" style={{ "--tw-divide-color": "var(--color-border-subtle)" } as React.CSSProperties}>
                {notices.length === 0 ? (
                  <div className="p-5 text-center">
                    <p className="text-[13px]" style={{ color: "var(--color-text-faint)" }}>
                      Sem pendências no momento.
                    </p>
                  </div>
                ) : (
                  notices.map((n) => (
                    <Link
                      key={n.id}
                      to="/comunicacao"
                      onClick={() => setIsNotifOpen(false)}
                      className="flex gap-3 p-3.5 transition-colors duration-100"
                      style={{ display: "flex" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: n.type === "Turno"
                            ? "var(--color-shift-night-bg)"
                            : "var(--color-accent-subtle)",
                          color: n.type === "Turno"
                            ? "var(--color-shift-night)"
                            : "var(--color-accent)",
                        }}
                      >
                        {n.type === "Turno"
                          ? <ArrowRightLeft size={13} strokeWidth={2} />
                          : <Megaphone size={13} strokeWidth={2} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-text)" }}>
                          {n.title}
                        </p>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-faint)" }}>
                          @{n.createdByUserName}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Footer do dropdown */}
              <Link
                to="/comunicacao"
                onClick={() => setIsNotifOpen(false)}
                className="block text-center py-2.5 text-[12px] font-semibold transition-colors"
                style={{
                  borderTop: "1px solid var(--color-border-subtle)",
                  color: "var(--color-accent-text)",
                  backgroundColor: "var(--color-surface-dim)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-accent-subtle)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-dim)";
                }}
              >
                Ver painel completo
              </Link>
            </div>
          </Dropdown>
        </div>

        {/* ── Perfil do usuário ─────────────────────────────────────── */}
        <div
          className="relative ml-1"
          style={{ paddingLeft: "12px", borderLeft: "1px solid var(--color-border)" }}
          ref={dropdownRef}
        >
          <button
            id="header-profile-btn"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            className="flex items-center gap-2.5 px-2 py-1 rounded-[8px] transition-colors duration-120"
            style={{
              backgroundColor: isDropdownOpen ? "var(--color-surface-raised)" : "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isDropdownOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDropdownOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }
            }}
          >
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-semibold leading-none" style={{ color: "var(--color-text)" }}>
                {displayName}
              </p>
              {displayRegistration && (
                <p className="text-[10.5px] mt-0.5 font-medium" style={{ color: "var(--color-text-faint)" }}>
                  {displayRegistration}
                </p>
              )}
            </div>
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
              }}
            >
              {initialLetter}
            </div>
          </button>

          {/* Dropdown de perfil */}
          <Dropdown isOpen={isDropdownOpen} className="w-[200px]">
            <div
              className="rounded-[10px] overflow-hidden py-1"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-dropdown)",
              }}
            >
              {/* Info do usuário */}
              <div className="px-3 py-2.5 mb-1" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--color-text)" }}>
                  {email ?? ""}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-faint)" }}>
                  Acesso autorizado
                </p>
              </div>

              {/* Links do menu */}
              {[
                { to: "/perfil",        icon: UserIcon,  label: "Meu Perfil" },
                { to: "/configuracoes", icon: Settings,  label: "Configurações" },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors duration-100"
                  style={{ color: "var(--color-text-muted)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {label}
                </Link>
              ))}

              {/* Separador */}
              <div className="my-1" style={{ height: "1px", backgroundColor: "var(--color-border-subtle)" }} />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors duration-100"
                style={{ color: "var(--color-error)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-error-subtle)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <LogOut size={15} strokeWidth={1.8} />
                Encerrar sessão
              </button>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};
