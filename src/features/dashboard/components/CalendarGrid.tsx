import { useEffect, useState, useCallback, useMemo } from "react";
import { scheduleService } from "../api/scheduleService";
import { holidayService, type Holiday } from "../../settings/api/holidayService";
import type { ScheduleDay } from "../types";
import { X, PartyPopper, Palmtree, ArrowLeftRight, UserX } from "lucide-react";
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
  <div className="grid grid-cols-7 gap-3" style={{ gridTemplateRows: "repeat(5, minmax(0, 1fr))" }}>
    {Array.from({ length: 35 }).map((_, i) => (
      <div key={i} className="skeleton rounded-xl" style={{ minHeight: "110px" }} />
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

  // FIX: 11 — new Date() no render body cacheado via useMemo
  const today = useMemo(() => new Date(), []);

  return (
    <div
      className="flex-1 flex flex-col w-full rounded-2xl p-4 pb-6 relative min-h-0"
      style={{ backgroundColor: "var(--color-surface-dim)" }}
    >
      {/* ── Cabeçalho dos dias da semana ──────────────────────────── */}
      <div className="grid grid-cols-7 gap-3 mb-3 shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-bold uppercase tracking-widest"
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
          className="grid grid-cols-7 gap-3 flex-1 min-h-0"
          style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}
        >
          {/* Espaços vazios antes do primeiro dia */}
          {Array.from({ length: firstDayIndex }).map((_, index) => (
            <div key={`empty-${index}`} className="rounded-xl opacity-20 bg-black/10" />
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

            const hasAbsenceInDay = dayShifts.some((s) => s.hasAbsence);

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
                // FIX: 14 — Uso de classes Tailwind em vez de eventos onMouseOver
                className="rounded-xl border p-2.5 flex flex-col overflow-hidden cursor-pointer select-none outline-none min-h-[110px] transition-all duration-150 ease-out hover:shadow-md hover:-translate-y-[2px]"
                style={{
                  backgroundColor: isToday
                    ? "var(--color-accent-subtle)"
                    : "var(--color-surface)",
                  borderColor: isToday
                    ? "var(--color-accent)"
                    : currentHoliday
                    ? "var(--color-warning)"
                    : "var(--color-border-subtle)"
                }}
              >
                {/* Topo: número do dia, feriado e badge de ausência */}
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold"
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
                        className="text-[11px] font-semibold truncate max-w-[70px]"
                        style={{ color: "var(--color-warning)" }}
                        title={currentHoliday.name}
                      >
                        {currentHoliday.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Badge de ausências refatorado para alto destaque visual */}
                    {hasAbsenceInDay && (
                      <div
                        title={`${dayShifts.flatMap((s) => s.absences).length} ausência(s) neste dia`}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold tracking-wider animate-pulse"
                      >
                        <UserX size={11} strokeWidth={2.5} />
                        <span>AUSENTE</span>
                      </div>
                    )}
                    {isToday && (
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
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

                {/* Turnos do dia - Tipografia ampliada para melhor leitura */}
                <div
                  className="flex flex-col gap-1.5 flex-1 overflow-y-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  {dayShifts.map((shift) => {
                    const style = getShiftStyle(shift.shiftName);
                    const teamName = getTeamName(shift.letterId, letters);
                    const isFaded = selectedTeam !== null && shift.letterId !== selectedTeam;

                    return (
                      <div
                        key={shift.id}
                        className={`rounded-lg border px-2 py-1 shrink-0 ${style.card}`}
                        style={{
                          opacity: isFaded ? 0.3 : 1,
                          filter: isFaded ? "grayscale(1)" : "none",
                          transition: "opacity 250ms ease-out, filter 250ms ease-out",
                        }}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${style.badge}`}>
                            {style.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {shift.isSwapped && (
                              <span
                                title={shift.swappedWithUserName ? `Trocado com ${shift.swappedWithUserName}` : "Turno trocado"}
                                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                              >
                                <ArrowLeftRight size={10} strokeWidth={2.5} />
                              </span>
                            )}
                            <span
                              className="text-xs font-extrabold whitespace-nowrap"
                              style={{ color: isFaded ? "var(--color-text-faint)" : "var(--color-text)" }}
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
                      className="text-center text-xs py-2 font-medium flex items-center justify-center flex-1"
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
                backgroundColor: "oklch(5% 0 0 / 60%)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setExpandedDay(null)}
            />

            {/* Modal */}
            <div
              className="relative w-full max-w-[380px] rounded-2xl p-6 shadow-2xl"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
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
                className="absolute top-4 right-4 p-2 rounded-full transition-colors duration-150"
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
                <X size={20} strokeWidth={2} />
              </button>

              {/* Cabeçalho do modal */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm"
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
                <div className="overflow-hidden">
                  <h3
                    className="text-lg font-bold capitalize flex items-center gap-2 truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {diaDaSemana}
                    {modalHoliday && (
                      <PartyPopper size={16} style={{ color: "var(--color-warning)" }} className="shrink-0" />
                    )}
                  </h3>
                  <p className="text-sm mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
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
                      className={`rounded-xl border px-4 py-3.5 ${style.card}`}
                      style={{
                        opacity: isFaded ? 0.3 : 1,
                        filter: isFaded ? "grayscale(1)" : "none",
                        transition: "opacity 200ms ease-out",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg whitespace-nowrap ${style.badge}`}>
                          {style.label}
                        </span>
                        <span
                          className="text-base font-extrabold"
                          style={{ color: isFaded ? "var(--color-text-faint)" : "var(--color-text)" }}
                        >
                          Equipe {teamName}
                        </span>
                      </div>
                      {/* Indicador de turno trocado */}
                      {shift.isSwapped && (
                        <div
                          className="flex items-center gap-2 mt-2.5 pt-2.5"
                          style={{ borderTop: "1px dashed var(--color-accent-dim)" }}
                        >
                          <ArrowLeftRight size={14} style={{ color: "var(--color-accent)" }} />
                          <span className="text-xs font-bold" style={{ color: "var(--color-accent-text)" }}>
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
                    className="text-center py-8 rounded-xl"
                    style={{ backgroundColor: "var(--color-surface-dim)" }}
                  >
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-faint)" }}>
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
                      className="rounded-xl p-4 mt-2"
                      style={{
                        backgroundColor: "var(--color-warning-subtle)",
                        border: "1px solid var(--color-warning)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Palmtree size={16} style={{ color: "var(--color-warning)" }} />
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-warning)" }}>
                          Ausências do Dia ({unique.length})
                        </h4>
                      </div>
                      <ul className="space-y-2.5">
                        {unique.map((a) => (
                          <li key={a.absenceId} className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                            <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>{a.userName}</span>
                            <span className="text-gray-400">{a.typeDescription}</span>
                            {a.substituteUserName && (
                              <span className="text-xs ml-1.5 font-medium px-1.5 py-0.5 rounded bg-black/20" style={{ color: "var(--color-warning)" }}>
                                Cobertura: {a.substituteUserName}
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