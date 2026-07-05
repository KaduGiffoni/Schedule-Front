import { useEffect, useState, useCallback } from "react";
import { scheduleService } from "../api/scheduleService";
import { holidayService, type Holiday } from "../../settings/api/holidayService";
import type { ScheduleDay } from "../types";
import { X, PartyPopper, Palmtree, ArrowLeftRight } from "lucide-react";
import {
  SHIFT_ORDER,
  getShiftStyle,
  getTeamName,
  normalizeShiftName,
  parseShiftDay,
  parseDateParts,
} from "../../../lib/schedule-utils";
import { useLettersStore } from "../../letters/store/lettersStore";

// ── Skeleton Loader do Calendário ─────────────────────────────────────────────
const CalendarSkeleton = () => (
  <div className="grid grid-cols-7 gap-2" style={{ gridTemplateRows: "repeat(5, minmax(0, 1fr))" }}>
    {Array.from({ length: 35 }).map((_, i) => (
      <div key={i} className="skeleton rounded-[10px]" style={{ minHeight: "80px" }} />
    ))}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface CalendarGridProps {
  year: number;
  month: number;
  selectedTeam: number | null;
  onDayHover?: (day: number | null) => void;
}

export const CalendarGrid = ({
  year,
  month,
  selectedTeam,
  onDayHover,
}: CalendarGridProps) => {
  const [shifts, setShifts] = useState<ScheduleDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Letras/equipes dinâmicas via /api/Letters
  const { letters, fetchLetters } = useLettersStore();
  useEffect(() => { fetchLetters(); }, [fetchLetters]);

  // Bloqueia scroll do body enquanto modal está aberto
  useEffect(() => {
    if (expandedDay !== null) {
      document.body.style.overflow = "hidden";
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") setExpandedDay(null);
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleEsc);
      };
    }
  }, [expandedDay]);

  // Fetch de dados
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [escalaData, feriadosData] = await Promise.all([
          scheduleService.getEscalaGeral(year, month),
          holidayService.getAll().then((res) => res.data).catch(() => []),
        ]);
        if (!cancelled) {
          setShifts(escalaData);
          setHolidays(feriadosData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do calendário:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [year, month]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const daysInMonthCount = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const weeksCount = Math.ceil((firstDayIndex + daysInMonthCount) / 7);

  const getShiftsForDay = useCallback(
    (day: number) => shifts.filter((s) => parseShiftDay(s.date) === day),
    [shifts]
  );

  const today = new Date();

  return (
    <div
      className="flex-1 flex flex-col w-full rounded-2xl p-3 pb-5 relative min-h-0"
      style={{ backgroundColor: "var(--color-surface-dim)" }}
    >
      {/* ── Cabeçalho dos dias da semana ──────────────────────────── */}
      <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-faint)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── Conteúdo: Skeleton ou Grid ────────────────────────────── */}
      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <div
          className="grid grid-cols-7 gap-2 flex-1 min-h-0"
          style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}
        >
          {/* Espaços vazios antes do primeiro dia */}
          {Array.from({ length: firstDayIndex }).map((_, index) => (
            <div key={`empty-${index}`} className="rounded-[10px] opacity-30" />
          ))}

          {/* Dias reais */}
          {Array.from({ length: daysInMonthCount }).map((_, i) => {
            const day = i + 1;
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() + 1 &&
              year === today.getFullYear();

            const currentHoliday = holidays.find((h) => {
              const { year: hY, month: hM, day: hD } = parseDateParts(h.date);
              return hY === year && hM === month && hD === day;
            });

            const dayShifts = getShiftsForDay(day).sort((a, b) => {
              const nameA = normalizeShiftName(a.shiftName);
              const nameB = normalizeShiftName(b.shiftName);
              return (SHIFT_ORDER[nameA] ?? 99) - (SHIFT_ORDER[nameB] ?? 99);
            });

            return (
              <div
                key={day}
                role="button"
                tabIndex={0}
                aria-label={`${day} de ${month}, ${dayShifts.length} turnos`}
                onClick={() => setExpandedDay(day)}
                onKeyDown={(e) => e.key === "Enter" && setExpandedDay(day)}
                onMouseEnter={() => onDayHover?.(day)}
                onMouseLeave={() => onDayHover?.(null)}
                className="rounded-[10px] border py-1.5 px-2 flex flex-col overflow-hidden cursor-pointer select-none outline-none"
                style={{
                  backgroundColor: isToday
                    ? "var(--color-accent-subtle)"
                    : "var(--color-surface)",
                  borderColor: isToday
                    ? "var(--color-accent)"
                    : currentHoliday
                    ? "var(--color-warning)"
                    : "var(--color-border-subtle)",
                  transition: "box-shadow 150ms ease-out, transform 150ms ease-out, border-color 150ms ease-out",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Topo: número do dia e identificação */}
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div
                      className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[12px] font-bold"
                      style={{
                        backgroundColor: isToday
                          ? "var(--color-accent)"
                          : currentHoliday
                          ? "var(--color-warning)"
                          : "var(--color-surface-dim)",
                        color: isToday || currentHoliday
                          ? "white"
                          : "var(--color-text-muted)",
                      }}
                    >
                      {day}
                    </div>
                    {currentHoliday && !isToday && (
                      <span
                        className="text-[9px] font-semibold truncate max-w-[55px]"
                        style={{ color: "var(--color-warning)" }}
                        title={currentHoliday.name}
                      >
                        {currentHoliday.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Badge de ausências */}
                    {dayShifts.some((s) => s.hasAbsence) && (
                      <span
                        title={`${dayShifts.flatMap((s) => s.absences).length} ausência(s) neste dia`}
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--color-warning-subtle)", color: "var(--color-warning)" }}
                      >
                        <Palmtree size={9} strokeWidth={2.5} />
                      </span>
                    )}
                    {isToday && (
                      <div
                        className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]"
                        style={{
                          backgroundColor: "var(--color-accent-dim)",
                          color: "var(--color-accent-text)",
                        }}
                      >
                        Hoje
                      </div>
                    )}
                  </div>
                </div>

                {/* Turnos do dia */}
                <div
                  className="flex flex-col gap-[3px] flex-1 overflow-y-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  {dayShifts.map((shift) => {
                    const style = getShiftStyle(shift.shiftName);
                    const teamName = getTeamName(shift.letterId, letters);
                    const isFaded = selectedTeam !== null && shift.letterId !== selectedTeam;

                    return (
                      <div
                        key={shift.id}
                        className={`rounded-[5px] border px-1.5 py-[3px] shrink-0 ${style.card}`}
                        style={{
                          opacity: isFaded ? 0.3 : 1,
                          filter: isFaded ? "grayscale(1)" : "none",
                          transition: "opacity 250ms ease-out, filter 250ms ease-out",
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[9px] font-semibold px-1 py-[1px] rounded-[3px] whitespace-nowrap ${style.badge}`}>
                            {style.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {shift.isSwapped && (
                              <span
                                title={shift.swappedWithUserName ? `Trocado com ${shift.swappedWithUserName}` : "Turno trocado"}
                                className="w-3 h-3 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                              >
                                <ArrowLeftRight size={7} strokeWidth={2.5} />
                              </span>
                            )}
                            <span
                              className="text-[10px] font-bold whitespace-nowrap"
                              style={{ color: isFaded ? "var(--color-text-faint)" : "var(--color-text-muted)" }}
                            >
                              Eq. {teamName}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {dayShifts.length === 0 && (
                    <div
                      className="text-center text-[10px] py-1"
                      style={{ color: currentHoliday ? "var(--color-warning)" : "var(--color-text-faint)" }}
                    >
                      Sem escala
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Lightbox ────────────────────────────────────────── */}
      {expandedDay !== null && (() => {
        const isTodayModal =
          expandedDay === today.getDate() &&
          month === today.getMonth() + 1 &&
          year === today.getFullYear();

        const modalHoliday = holidays.find((h) => {
          const { year: hY, month: hM, day: hD } = parseDateParts(h.date);
          return hY === year && hM === month && hD === expandedDay;
        });

        const modalShifts = getShiftsForDay(expandedDay).sort((a, b) => {
          const nameA = normalizeShiftName(a.shiftName);
          const nameB = normalizeShiftName(b.shiftName);
          return (SHIFT_ORDER[nameA] ?? 99) - (SHIFT_ORDER[nameB] ?? 99);
        });

        const dateObj = new Date(year, month - 1, expandedDay);
        const diaDaSemana = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });

        return (
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: "var(--z-modal)" }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: "oklch(5% 0 0 / 50%)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setExpandedDay(null)}
            />

            {/* Modal */}
            <div
              className="relative w-full max-w-[340px] rounded-2xl p-6"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-lg)",
                animation: "modal-enter 200ms var(--ease-out-expo) both",
              }}
            >
              <style>{`
                @keyframes modal-enter {
                  from { opacity: 0; transform: scale(0.95) translateY(8px); }
                  to   { opacity: 1; transform: scale(1) translateY(0); }
                }
              `}</style>

              <button
                onClick={() => setExpandedDay(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full transition-colors duration-120"
                aria-label="Fechar"
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
                <X size={18} strokeWidth={2} />
              </button>

              {/* Cabeçalho do modal */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: isTodayModal
                      ? "var(--color-accent)"
                      : modalHoliday
                      ? "var(--color-warning)"
                      : "var(--color-surface-dim)",
                    color: isTodayModal || modalHoliday ? "white" : "var(--color-text)",
                  }}
                >
                  {expandedDay}
                </div>
                <div>
                  <h3
                    className="text-[16px] font-semibold capitalize flex items-center gap-1.5"
                    style={{ color: "var(--color-text)" }}
                  >
                    {diaDaSemana}
                    {modalHoliday && (
                      <PartyPopper size={14} style={{ color: "var(--color-warning)" }} />
                    )}
                  </h3>
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {isTodayModal ? (
                      <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>Hoje</span>
                    ) : modalHoliday ? (
                      <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>
                        {modalHoliday.name}
                      </span>
                    ) : (
                      "Escala completa do dia"
                    )}
                  </p>
                </div>
              </div>

              {/* Turnos no modal */}
              <div className="flex flex-col gap-3">
                {modalShifts.map((shift) => {
                  const style = getShiftStyle(shift.shiftName);
                  const teamName = getTeamName(shift.letterId, letters);
                  const isFaded = selectedTeam !== null && shift.letterId !== selectedTeam;

                  return (
                    <div
                      key={shift.id}
                      className={`rounded-xl border px-4 py-3 ${style.card}`}
                      style={{
                        opacity: isFaded ? 0.3 : 1,
                        filter: isFaded ? "grayscale(1)" : "none",
                        transition: "opacity 200ms ease-out",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap ${style.badge}`}>
                          {style.label}
                        </span>
                        <span
                          className="text-[14px] font-bold"
                          style={{ color: isFaded ? "var(--color-text-faint)" : "var(--color-text)" }}
                        >
                          Equipe {teamName}
                        </span>
                      </div>
                      {/* Indicador de turno trocado */}
                      {shift.isSwapped && (
                        <div
                          className="flex items-center gap-1.5 mt-2 pt-2"
                          style={{ borderTop: "1px dashed var(--color-accent-dim)" }}
                        >
                          <ArrowLeftRight size={11} style={{ color: "var(--color-accent)" }} />
                          <span className="text-[11px] font-semibold" style={{ color: "var(--color-accent-text)" }}>
                            Turno trocado
                            {shift.swappedWithUserName
                              ? ` com ${shift.swappedWithUserName}`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {modalShifts.length === 0 && (
                  <div
                    className="text-center py-6 rounded-xl"
                    style={{ backgroundColor: "var(--color-surface-dim)" }}
                  >
                    <p className="text-[13px]" style={{ color: "var(--color-text-faint)" }}>
                      Nenhuma escala atribuída.
                    </p>
                  </div>
                )}

                {/* Seção de ausências do dia */}
                {(() => {
                  const allAbsences = modalShifts.flatMap((s) => s.absences ?? []);
                  // Deduplica por absenceId
                  const unique = allAbsences.filter(
                    (a, idx, arr) => arr.findIndex((x) => x.absenceId === a.absenceId) === idx
                  );
                  if (unique.length === 0) return null;
                  return (
                    <div
                      className="rounded-xl p-4 mt-1"
                      style={{
                        backgroundColor: "var(--color-warning-subtle)",
                        border: "1px solid var(--color-warning)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-3">
                        <Palmtree size={14} style={{ color: "var(--color-warning)" }} />
                        <h4 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-warning)" }}>
                          Ausências do Dia ({unique.length})
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {unique.map((a) => (
                          <li key={a.absenceId} className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                            <span className="font-semibold" style={{ color: "var(--color-text)" }}>{a.userName}</span>
                            {" — "}{a.typeDescription}
                            {a.substituteUserName && (
                              <span className="text-[11px] ml-1" style={{ color: "var(--color-text-faint)" }}>
                                (Cobertura: {a.substituteUserName})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
