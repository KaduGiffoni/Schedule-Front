import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useHasRole } from "../../lib/useHasRole";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  HelpCircle,
  Users,
  Home,
  Radio,
  CalendarOff,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export const Sidebar = () => {
  const location = useLocation();
  const isAdminOrManager = useHasRole('Admin', 'Manager');
  const isAdmin = useHasRole('Admin');

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const groups: MenuGroup[] = [
    {
      label: "Operação",
      items: [
        { icon: Home,            label: "Início",           path: "/home" },
        { icon: LayoutDashboard, label: "Painel de Escalas", path: "/dashboard" },
        { icon: Megaphone,       label: "Mural e Plantão",  path: "/comunicacao" },
        { icon: ArrowLeftRight,  label: "Trocas de Turno",  path: "/trocas" },
        { icon: CalendarOff,     label: "Ausências",         path: "/ausencias" },
      ],
    },
    // Grupo "Gestão" só aparece para Admin/Manager
    ...(isAdminOrManager
      ? [{
          label: "Gestão",
          items: [
            { icon: Users,       label: "Usuários",       path: "/users" },
            ...(isAdmin ? [{ icon: ShieldCheck, label: "Administração", path: "/administracao" }] : []),
          ] as MenuItem[],
        }]
      : []),
  ];

  const systemItems: MenuItem[] = [
    { icon: Settings,   label: "Configurações", path: "/configuracoes" },
    { icon: HelpCircle, label: "Suporte",        path: "/suporte" },
  ];

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 12px",
    borderRadius: "6px",
    fontSize: "13.5px",
    fontWeight: 500,
    textDecoration: "none",
    transition: "background-color 150ms ease-out, color 150ms ease-out",
    color: active ? "var(--color-accent-text)" : "var(--color-text-muted)",
    backgroundColor: active ? "var(--color-accent-dim)" : "transparent",
  });

  const renderLink = (item: MenuItem) => {
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        style={linkStyle(active)}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
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
          size={16}
          strokeWidth={active ? 2.5 : 1.8}
          style={{ color: active ? "var(--color-accent)" : "inherit", flexShrink: 0 }}
        />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      style={{
        width: "220px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        backgroundColor: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
    >
      {/* ── Logo / Brand ───────────────────────────────────────── */}
      <div
        style={{
          padding: "20px 16px 18px",
          borderBottom: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px", height: "32px",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "var(--color-accent)",
              flexShrink: 0,
            }}
          >
            <Radio size={16} color="white" strokeWidth={2} />
          </div>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1, color: "var(--color-text)" }}>
              NOC-PRO
            </p>
            <p style={{ fontSize: "11px", fontWeight: 500, marginTop: "2px", color: "var(--color-text-faint)" }}>
              Gestão de Turnos
            </p>
          </div>
        </div>
      </div>

      {/* ── Navegação por grupos ───────────────────────────────── */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
        {groups.map((group) => (
          <div key={group.label}>
            {/* Rótulo do grupo */}
            <p
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text-faint)",
                padding: "0 12px",
                marginBottom: "4px",
              }}
            >
              {group.label}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {group.items.map(renderLink)}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Navegação sistema ─────────────────────────────────── */}
      <div
        style={{
          padding: "8px 8px 16px",
          borderTop: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}
      >
        {/* Rótulo sistema */}
        <p
          style={{
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-faint)",
            padding: "8px 12px 4px",
          }}
        >
          Sistema
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {systemItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...linkStyle(active),
                  fontSize: "13px",
                  color: active ? "var(--color-accent-text)" : "var(--color-text-faint)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
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
                <item.icon size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
