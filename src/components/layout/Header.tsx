import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  User as UserIcon,
  LogOut,
  Settings,
  Sun,
  Moon,
  CheckCheck,
  ArrowRightLeft,
  Megaphone,
  CalendarOff,
  Info,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";
import { useTheme } from "../../lib/theme";
import { notificationsService } from "../../features/notifications/api/notificationsService";
import type { Notification } from "../../features/notifications/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formata uma data ISO em tempo relativo curto (ex: "há 5m", "há 2h") */
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/** Ícone baseado no type da notificação */
function NotifIcon({ type }: { type: string }) {
  const lower = type.toLowerCase();
  if (lower.includes("shift") || lower.includes("handover"))
    return <ArrowRightLeft size={13} strokeWidth={2} />;
  if (lower.includes("absence") || lower.includes("ausencia"))
    return <CalendarOff size={13} strokeWidth={2} />;
  if (lower.includes("notice") || lower.includes("aviso"))
    return <Megaphone size={13} strokeWidth={2} />;
  return <Info size={13} strokeWidth={2} />;
}

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { toggleTheme, isDark } = useTheme();

  const userProfile = useAuthStore((state) => state.userProfile);
  const email = useAuthStore((state) => state.email);

  const displayName = userProfile?.completeName ?? email ?? "Operador";
  const displayRegistration = userProfile?.registration ?? "";
  const initialLetter = (userProfile?.completeName ?? email ?? "O")
    .charAt(0)
    .toUpperCase();

  // Contagem de não-lidas derivada do state local
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Fetch de notificações ────────────────────────────────────────────────────
  // FIX: 6 — AbortController adicionado ao polling
  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await notificationsService.getNotifications(signal).catch(() => null);
      if (!signal?.aborted) setNotifications(data ?? []);
    } catch {
      // Silencia erros de rede — o sino fica sem badge
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchNotifications(controller.signal);
    // Polling a cada 60s
    const interval = setInterval(() => fetchNotifications(controller.signal), 60_000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [fetchNotifications]);

  // ── Marcar uma notificação como lida ────────────────────────────────────────
  const handleMarkRead = useCallback(
    async (notif: Notification) => {
      if (!notif.isRead) {
        // Optimistic update — atualiza localmente antes da resposta
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        notificationsService.markAsRead(notif.id).catch(() => {
          // Se falhar, reverte
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, isRead: false } : n))
          );
        });
      }

      setIsNotifOpen(false);

      // Navegar para o aviso relacionado (se houver)
      if (notif.referenceNoticeId !== null) {
        navigate(`/comunicacao?noticeId=${notif.referenceNoticeId}`);
      }
    },
    [navigate]
  );

  // ── Marcar todas como lidas ──────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsService.markAllRead();
    } catch {
      // Reverte em caso de erro
      await fetchNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  }, [unreadCount, isMarkingAll, fetchNotifications]);

  // ── Fecha menus ao clicar fora ──────────────────────────────────────────────
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
    // FIX: 2 — localStorage redundante removido no logout
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
      {/* FIX: 13 — Campo de busca removido */}
      <div className="flex-1 max-w-[400px]" />

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
            {/* Badge de não-lidas */}
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold border-2 px-0.5"
                style={{
                  backgroundColor: "var(--color-error)",
                  borderColor: "var(--color-header-bg)",
                  color: "white",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* ── Dropdown de notificações ─────────────────────────────── */}
          <Dropdown isOpen={isNotifOpen} className="w-[340px]">
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
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Notificações
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]"
                      style={{
                        backgroundColor: "var(--color-error)",
                        color: "white",
                      }}
                    >
                      {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Botão "Marcar todas como lidas" */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAll}
                    className="flex items-center gap-1 text-[11px] font-semibold rounded-[4px] px-2 py-1 transition-colors"
                    style={{
                      color: "var(--color-accent-text)",
                      backgroundColor: "var(--color-accent-dim)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-accent-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-accent-dim)";
                    }}
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck size={12} strokeWidth={2.5} />
                    {isMarkingAll ? "..." : "Todas lidas"}
                  </button>
                )}
              </div>

              {/* Lista de notificações */}
              <div className="max-h-[320px] overflow-y-auto divide-y" style={{ "--tw-divide-color": "var(--color-border-subtle)" } as React.CSSProperties}>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center gap-2">
                    <Bell size={22} style={{ color: "var(--color-text-faint)" }} strokeWidth={1.2} />
                    <p className="text-[13px]" style={{ color: "var(--color-text-faint)" }}>
                      Tudo em dia — sem notificações.
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleMarkRead(n)}
                      className="w-full flex gap-3 px-4 py-3 text-left transition-colors duration-100 relative"
                      style={{
                        backgroundColor: n.isRead ? "transparent" : "var(--color-accent-dim)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = n.isRead
                          ? "var(--color-surface-raised)"
                          : "var(--color-accent-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = n.isRead
                          ? "transparent"
                          : "var(--color-accent-dim)";
                      }}
                    >
                      {/* Indicador de não-lida */}
                      {!n.isRead && (
                        <span
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                          style={{ backgroundColor: "var(--color-accent)" }}
                        />
                      )}

                      {/* Ícone de tipo */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: "var(--color-surface-dim)",
                          color: "var(--color-text-muted)",
                          border: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <NotifIcon type={n.type} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[12.5px] leading-snug line-clamp-2 ${!n.isRead ? "font-semibold" : "font-medium"}`}
                          style={{ color: "var(--color-text)" }}
                        >
                          {n.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px]" style={{ color: "var(--color-text-faint)" }}>
                            {timeAgo(n.createdAt)}
                          </span>
                          {n.referenceNoticeId !== null && (
                            <>
                              <span style={{ color: "var(--color-border)" }}>·</span>
                              <span className="text-[11px] font-medium" style={{ color: "var(--color-accent-text)" }}>
                                Ver aviso
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
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
                Ver painel de comunicação
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
