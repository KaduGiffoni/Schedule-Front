import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RightSidebarContent } from "../components/RightSidebarContent";
import { CalendarGrid } from "../components/CalendarGrid";
import { MONTHS_PT } from "../../../lib/schedule-utils";

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 1) { setCurrentYear((y) => y - 1); return 12; }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 12) { setCurrentYear((y) => y + 1); return 1; }
      return prev + 1;
    });
  };

  const teams = [
    { id: null, label: "Todas" },
    { id: 1,    label: "A" },
    { id: 2,    label: "B" },
    { id: 3,    label: "C" },
    { id: 4,    label: "D" },
  ];

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
    >
      {/* ── Conteúdo principal ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 pb-8 pt-5 flex flex-col min-h-0">

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          {/* Abas de visão */}
          <div className="flex gap-1">
            {["Escala Completa", "Minha Escala"].map((label, i) => (
              <button
                key={label}
                className="px-3 py-1.5 text-[13px] font-semibold rounded-[6px] transition-colors duration-120"
                style={{
                  backgroundColor: i === 0 ? "var(--color-accent-dim)" : "transparent",
                  color: i === 0 ? "var(--color-accent-text)" : "var(--color-text-faint)",
                }}
                onMouseEnter={(e) => {
                  if (i !== 0) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (i !== 0) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-faint)";
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filtro de equipe */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11.5px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-faint)" }}
            >
              Equipe:
            </span>
            <div
              className="flex rounded-[6px] overflow-hidden"
              style={{ border: "1px solid var(--color-border)" }}
            >
              {teams.map(({ id, label }) => {
                const isActive = selectedTeam === id;
                return (
                  <button
                    key={String(id)}
                    onClick={() => setSelectedTeam(id)}
                    className="px-3 py-1.5 text-[12px] font-bold transition-colors duration-100"
                    style={{
                      backgroundColor: isActive ? "var(--color-accent)" : "var(--color-surface)",
                      color: isActive ? "white" : "var(--color-text-muted)",
                      borderRight: "1px solid var(--color-border)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cabeçalho do calendário */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2
              className="text-[22px] font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              {MONTHS_PT[currentMonth - 1]} de {currentYear}
            </h2>
            <div className="flex gap-0.5">
              {[
                { onClick: handlePrevMonth, icon: ChevronLeft,  label: "Mês anterior" },
                { onClick: handleNextMonth, icon: ChevronRight, label: "Próximo mês" },
              ].map(({ onClick, icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={onClick}
                  aria-label={label}
                  className="p-1.5 rounded-[6px] transition-colors duration-120"
                  style={{ color: "var(--color-text-faint)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-faint)";
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>

          {/* Legenda */}
          <div
            className="flex gap-4 text-[12px] font-medium px-3.5 py-2 rounded-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            {[
              { color: "var(--color-shift-morning)",   label: "Manhã" },
              { color: "var(--color-shift-afternoon)",  label: "Tarde" },
              { color: "var(--color-shift-night)",      label: "Noite" },
              { color: "var(--color-shift-off)",        label: "Folga" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Grade do calendário */}
        <div className="flex-1 min-h-0 flex flex-col">
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            selectedTeam={selectedTeam}
            onDayHover={setHoveredDay}
          />
        </div>
      </main>

      {/* ── Sidebar direita ───────────────────────────────────────── */}
      <aside
        className="w-[360px] shrink-0 overflow-hidden"
        style={{ borderLeft: "1px solid var(--color-border)" }}
      >
        <RightSidebarContent
          hoveredDay={hoveredDay}
          viewedMonth={currentMonth}
          viewedYear={currentYear}
        />
      </aside>
    </div>
  );
}
