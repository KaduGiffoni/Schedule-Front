import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  HelpCircle,
  Users,
  Home,
  Radio,
} from "lucide-react";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

export const Sidebar = () => {
  const location = useLocation();

  // TODO: Conectar ao AuthStore quando o backend fornecer o campo 'role' no perfil
  const menuItems: MenuItem[] = [
    { icon: Home,            label: "Início",           path: "/home" },
    { icon: LayoutDashboard, label: "Painel de Escalas", path: "/dashboard" },
    { icon: ArrowLeftRight,  label: "Mural e Plantão",  path: "/comunicacao" },
    { icon: Users,           label: "Usuários",          path: "/users" },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside
      className="w-[240px] h-screen flex flex-col shrink-0"
      style={{
        backgroundColor: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
    >
      {/* ── Logo / Brand ─────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <Radio size={16} color="white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none" style={{ color: "var(--color-text)" }}>
              NOC-PRO
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--color-text-faint)" }}>
              Gestão de Turnos
            </p>
          </div>
        </div>
      </div>

      {/* ── Navegação principal ───────────────────────────────────── */}
      <nav className="flex-1 px-3 pt-4 flex flex-col gap-0.5">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13.5px] font-medium transition-all duration-150"
              style={{
                color: active ? "var(--color-accent-text)" : "var(--color-text-muted)",
                backgroundColor: active ? "var(--color-accent-dim)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--color-surface-raised)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                }
              }}
            >
              <item.icon
                size={17}
                strokeWidth={active ? 2.5 : 1.8}
                style={{ color: active ? "var(--color-accent)" : "inherit" }}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Navegação secundária ──────────────────────────────────── */}
      <div
        className="px-3 pb-5 pt-3 flex flex-col gap-0.5"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        {[
          { icon: Settings,    label: "Configurações", path: "/configuracoes" },
          { icon: HelpCircle,  label: "Suporte",       path: "/suporte" },
        ].map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13.5px] font-medium transition-all duration-150"
              style={{
                color: active ? "var(--color-accent-text)" : "var(--color-text-faint)",
                backgroundColor: active ? "var(--color-accent-dim)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--color-surface-raised)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-faint)";
                }
              }}
            >
              <item.icon size={16} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};
