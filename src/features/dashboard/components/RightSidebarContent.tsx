import { useEffect, useState, useMemo } from "react";
import { Tent, PartyPopper, CalendarDays, ChevronLeft, Info, UserCheck } from "lucide-react";
import { scheduleService } from "../api/scheduleService";
import { usersService, type User } from "../../users/api/usersService";
import { holidayService, type Holiday } from "../../settings/api/holidayService";
import type { ScheduleDay } from "../types";
import {
  MONTHS_PT,
  normalizeShiftName,
  parseShiftDay,
  parseDateParts,
  getShiftStyle,
  getTeamName,
} from "../../../lib/schedule-utils";
import { useLettersStore } from "../../letters/store/lettersStore";

// ── Skeleton para o painel lateral ───────────────────────────────────────────
const SidebarSkeleton = () => (
  <div className="p-5 flex flex-col gap-4">
    <div className="skeleton h-5 w-40 rounded" />
    <div className="skeleton h-16 rounded-lg" />
    <div className="flex flex-col gap-3 mt-2">
      {[120, 90, 110].map((w, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="skeleton h-3 rounded" style={{ width: `${w}px` }} />
          <div className="skeleton h-8 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

// ── Cor do turno para o ponto colorido ───────────────────────────────────────
const SHIFT_COLOR_VARS: Record<string, string> = {
  Noite: "var(--color-shift-night)",
  Manha: "var(--color-shift-morning)",
  Tarde: "var(--color-shift-afternoon)",
  Folga: "var(--color-shift-off)",
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface RightSidebarProps {
  hoveredDay?: number | null;
  viewedMonth: number;
  viewedYear: number;
}

export const RightSidebarContent = ({
  hoveredDay = null,
  viewedMonth,
  viewedYear,
}: RightSidebarProps) => {
  const [todayShifts, setTodayShifts] = useState<ScheduleDay[]>([]);
  const [viewedMonthShifts, setViewedMonthShifts] = useState<ScheduleDay[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clickedHolidayId, setClickedHolidayId] = useState<number | null>(null);

  // Letras/equipes dinâmicas via /api/Letters
  const { letters, fetchLetters } = useLettersStore();
  useEffect(() => { fetchLetters(); }, [fetchLetters]);

  // FIX: 5 — useMemo para instanciar a data do render
  const { todayRender, formattedToday } = useMemo(() => {
    const d = new Date();
    return {
      todayRender: d,
      formattedToday: `${d.getDate()} ${MONTHS_PT[d.getMonth()].slice(0, 3)}`
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // FIX: 5 — instanciando data fresca no closure do fetchData
        const currentToday = new Date();
        const todayMonth = currentToday.getMonth() + 1;
        const todayYear = currentToday.getFullYear();
        const isSameMonth = todayYear === viewedYear && todayMonth === viewedMonth;

        const [todayData, viewedData, usersRes, holidaysRes] = await Promise.all([
          scheduleService.getEscalaGeral(todayYear, todayMonth),
          isSameMonth
            ? Promise.resolve(null)
            : scheduleService.getEscalaGeral(viewedYear, viewedMonth),
          usersService.getAllUsers().catch(() => [] as User[]),
          holidayService.getAll().then((res) => res.data).catch(() => [] as Holiday[]),
        ]);

        if (!cancelled) {
          setTodayShifts(todayData);
          setViewedMonthShifts(viewedData ?? todayData);
          setUsers(usersRes);
          setHolidays(holidaysRes);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da sidebar:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [viewedMonth, viewedYear]);

  // Limpa seleção ao mudar de mês
  useEffect(() => {
    setClickedHolidayId(null);
  }, [viewedMonth, viewedYear]);

  const formatName = (u: User) =>
    u.completeName ? `${u.surname ?? ""}`.trim() || u.user : u.user;

  const getActiveTeam = (shiftNameKey: string, dayShifts: ScheduleDay[]) => {
    const activeShift = dayShifts.find(
      (s) => normalizeShiftName(s.shiftName) === shiftNameKey
    );
    if (!activeShift) return { letter: "", users: [] };
    return {
      letter: getTeamName(activeShift.letterId, letters),
      users: users.filter((u) => Number(u.letterId) === Number(activeShift.letterId)),
    };
  };

  // Dados de Hoje
  const todayDayNum = todayRender.getDate();
  const shiftsForRealToday = todayShifts.filter((s) => parseShiftDay(s.date) === todayDayNum);
  const workingUsersToday = users.filter((u) =>
    shiftsForRealToday.find((s) => Number(s.letterId) === Number(u.letterId) && !s.isDayOff)
  );
  const folgaUsersToday = users.filter((u) =>
    shiftsForRealToday.find((s) => Number(s.letterId) === Number(u.letterId) && s.isDayOff)
  );

  const manhaToday = getActiveTeam("Manha", shiftsForRealToday);
  const tardeToday = getActiveTeam("Tarde", shiftsForRealToday);
  const noiteToday = getActiveTeam("Noite", shiftsForRealToday);
  const folgaToday = getActiveTeam("Folga", shiftsForRealToday);

  // Feriado ativo (hover > click > nenhum)
  let activeHolidayToView: Holiday | undefined;
  let activeHolidayShifts: ScheduleDay[] = [];
  let activeHolidayDayNum: number = 0;

  if (hoveredDay) {
    activeHolidayToView = holidays.find((h) => {
      const { year: hY, month: hM, day: hD } = parseDateParts(h.date);
      return hY === viewedYear && hM === viewedMonth && hD === hoveredDay;
    });
    if (activeHolidayToView) {
      activeHolidayDayNum = hoveredDay;
      activeHolidayShifts = viewedMonthShifts.filter((s) => parseShiftDay(s.date) === hoveredDay);
    }
  } else if (clickedHolidayId) {
    activeHolidayToView = holidays.find((h) => h.id === clickedHolidayId);
    if (activeHolidayToView) {
      const { day: hD } = parseDateParts(activeHolidayToView.date);
      activeHolidayDayNum = hD;
      activeHolidayShifts = viewedMonthShifts.filter((s) => parseShiftDay(s.date) === hD);
    }
  }

  // Feriados do mês visualizado, ordenados
  const viewedMonthHolidays = holidays
    .filter((h) => {
      const { year: hY, month: hM } = parseDateParts(h.date);
      return hY === viewedYear && hM === viewedMonth;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── Extração do Mural de Informações (Ausências do Mês) ────────────────────
  const monthAbsences = viewedMonthShifts
    .flatMap((s) => {
      const dayNum = parseShiftDay(s.date);
      return (s.absences ?? []).map((abs) => ({
        ...abs,
        dayNum,
      }));
    })
    // Deduplica por absenceId + dayNum
    .filter((a, idx, arr) => arr.findIndex((x) => x.absenceId === a.absenceId && x.dayNum === a.dayNum) === idx)
    .sort((a, b) => a.dayNum - b.dayNum);

  // ── Renderização ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <aside
        className="w-full h-full overflow-y-auto"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <SidebarSkeleton />
      </aside>
    );
  }

  return (
    <aside
      className="w-full h-full overflow-y-auto pl-5 pr-6 py-5 flex flex-col gap-5"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* ── 1. Escala de Hoje ─────────────────────────────────────── */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--color-surface-dim)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Tent size={18} style={{ color: "var(--color-shift-morning)" }} strokeWidth={2} />
          <h3 className="text-[15px] font-bold" style={{ color: "var(--color-text)" }}>
            Escala de Hoje
            <span className="text-xs font-normal ml-1.5" style={{ color: "var(--color-text-faint)" }}>
              ({formattedToday})
            </span>
          </h3>
        </div>

        {/* Status geral */}
        <div
          className="grid grid-cols-2 rounded-lg overflow-hidden mb-5"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {[
            { value: workingUsersToday.length, label: "Trabalhando", color: "var(--color-accent)" },
            { value: folgaUsersToday.length,   label: "Folga",       color: "var(--color-text-faint)" },
          ].map(({ value, label, color }, i) => (
            <div
              key={label}
              className="text-center py-3"
              style={{
                backgroundColor: "var(--color-surface)",
                borderRight: i === 0 ? `1px solid var(--color-border)` : "none",
              }}
            >
              <p
                className="text-[28px] font-bold leading-none data-numeric"
                style={{ color }}
              >
                {value}
              </p>
              <p
                className="text-[10.5px] font-bold uppercase tracking-wider mt-1"
                style={{ color: "var(--color-text-faint)" }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Turnos ativos */}
        <div className="space-y-4">
          {[
            { key: "Noite", label: "23h às 07h", data: noiteToday },
            { key: "Manha", label: "07h às 15h", data: manhaToday },
            { key: "Tarde", label: "15h às 23h", data: tardeToday },
          ].map(({ key, label, data }) =>
            data.letter ? (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: SHIFT_COLOR_VARS[key] }}
                  >
                    {label}
                  </h4>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-widest"
                    style={{
                      backgroundColor: `${SHIFT_COLOR_VARS[key]}20`,
                      color: SHIFT_COLOR_VARS[key],
                    }}
                  >
                    Letra {data.letter}
                  </span>
                </div>
                <ul className="space-y-1.5 pl-1">
                  {data.users.length > 0 ? (
                    data.users.map((u) => (
                      <li
                        key={u.userId}
                        className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: SHIFT_COLOR_VARS[key] }}
                        />
                        <span className="truncate">{formatName(u)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs italic pl-4" style={{ color: "var(--color-text-faint)" }}>
                      Nenhum operador atribuído.
                    </li>
                  )}
                </ul>
              </div>
            ) : null
          )}

          {folgaToday.letter && (
            <div
              className="pt-3 mt-1"
              style={{ borderTop: "1px solid var(--color-border-subtle)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Dia de Folga
                </h4>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-widest"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    color: "var(--color-text-faint)",
                  }}
                >
                  Letra {folgaToday.letter}
                </span>
              </div>
              <ul className="space-y-1.5 pl-1">
                {folgaToday.users.length > 0 ? (
                  folgaToday.users.map((u) => (
                    <li
                      key={u.userId}
                      className="flex items-center gap-2 text-sm font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--color-border)" }}
                      />
                      <span className="truncate">{formatName(u)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs italic pl-4" style={{ color: "var(--color-text-faint)" }}>
                    Nenhum operador.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Painel dinâmico: Feriado ou Lista ─────────────────── */}
      {activeHolidayToView ? (
        <div
          className="rounded-xl p-5 shadow-lg"
          style={{
            backgroundColor: "var(--color-warning-subtle)",
            border: "1px solid var(--color-warning)",
            animation: "fade-slide-in 200ms var(--ease-out-expo) both",
          }}
        >
          <style>{`
            @keyframes fade-slide-in {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Botão voltar */}
          {!hoveredDay && clickedHolidayId && (
            <button
              onClick={() => setClickedHolidayId(null)}
              className="flex items-center text-xs font-bold mb-4 transition-opacity"
              style={{ color: "var(--color-warning)" }}
            >
              <ChevronLeft size={16} className="mr-0.5" />
              Voltar para lista
            </button>
          )}

          <div className="flex items-center gap-2.5 mb-4">
            <PartyPopper size={20} style={{ color: "var(--color-warning)" }} className="shrink-0" />
            <div>
              <h3 className="text-sm font-bold leading-snug" style={{ color: "var(--color-text)" }}>
                Feriado — dia {activeHolidayDayNum}
              </h3>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--color-warning)" }}>
                {activeHolidayToView.name}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {["Noite", "Manha", "Tarde"].map((key) => {
              const data = getActiveTeam(key, activeHolidayShifts);
              if (!data.letter) return null;
              return (
                <div
                  key={key}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: SHIFT_COLOR_VARS[key] }}
                    >
                      {getShiftStyle(key).label}
                    </h4>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] uppercase"
                      style={{
                        backgroundColor: `${SHIFT_COLOR_VARS[key]}20`,
                        color: SHIFT_COLOR_VARS[key],
                      }}
                    >
                      Eq. {data.letter}
                    </span>
                  </div>
                  <ul className="space-y-1 pl-1">
                    {data.users.length > 0 ? (
                      data.users.map((u) => (
                        <li
                          key={u.userId}
                          className="flex items-center gap-2 text-xs font-medium"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: SHIFT_COLOR_VARS[key] }}
                          />
                          <span className="truncate">{formatName(u)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs italic" style={{ color: "var(--color-text-faint)" }}>
                        Sem operadores.
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Lista de feriados do mês */
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-dim)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} style={{ color: "var(--color-accent)" }} />
            <h3 className="text-[15px] font-bold" style={{ color: "var(--color-text)" }}>
              Feriados de {MONTHS_PT[viewedMonth - 1]}
            </h3>
          </div>

          <div className="space-y-2.5">
            {viewedMonthHolidays.length === 0 ? (
              <div
                className="text-center py-6 rounded-lg"
                style={{ border: "1px dashed var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--color-text-faint)" }}>
                  Nenhum feriado neste mês.
                </p>
              </div>
            ) : (
              viewedMonthHolidays.map((h) => {
                const { day: hDay } = parseDateParts(h.date);
                return (
                  <div
                    key={h.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setClickedHolidayId(h.id)}
                    onKeyDown={(e) => e.key === "Enter" && setClickedHolidayId(h.id)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer outline-none"
                    style={{
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-surface)",
                      transition: "all 150ms ease-out",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "var(--color-warning)";
                      el.style.backgroundColor = "var(--color-warning-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "var(--color-border)";
                      el.style.backgroundColor = "var(--color-surface)";
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-sm"
                      style={{
                        backgroundColor: "var(--color-warning-subtle)",
                        border: "1px solid var(--color-warning)",
                      }}
                    >
                      <span
                        className="text-[9px] font-bold uppercase leading-none"
                        style={{ color: "var(--color-warning)" }}
                      >
                        {MONTHS_PT[viewedMonth - 1].slice(0, 3)}
                      </span>
                      <span
                        className="text-base font-extrabold leading-none mt-0.5 data-numeric"
                        style={{ color: "var(--color-text)" }}
                      >
                        {hDay}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                        {h.name}
                      </h4>
                      <p className="text-xs truncate mt-0.5 font-medium" style={{ color: "var(--color-text-faint)" }}>
                        {h.type}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 3. NOVO COMPONENTE: Mural de Informações (Ausências do Mês) ── */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--color-surface-dim)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Info size={18} className="text-blue-400 shrink-0" />
          <h3 className="text-[15px] font-bold" style={{ color: "var(--color-text)" }}>
            Mural de Ausências
            <span className="text-xs font-normal ml-1.5" style={{ color: "var(--color-text-faint)" }}>
              ({MONTHS_PT[viewedMonth - 1]})
            </span>
          </h3>
        </div>

        <div className="flex flex-col gap-2.5">
          {monthAbsences.length === 0 ? (
            <div
              className="text-center py-6 rounded-lg"
              style={{ border: "1px dashed var(--color-border)", backgroundColor: "var(--color-surface)" }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--color-text-faint)" }}>
                Nenhuma ausência registrada para este mês.
              </p>
            </div>
          ) : (
            monthAbsences.map((abs, idx) => (
              <div
                key={`${abs.absenceId}-${abs.dayNum}-${idx}`}
                className="flex flex-col p-3 rounded-lg border"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-200 truncate">
                    {abs.userName}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 shrink-0"
                  >
                    Dia {abs.dayNum}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                  <span className="truncate font-medium">{abs.typeDescription}</span>
                </div>
                {abs.substituteUserName && (
                  <div
                    className="flex items-center gap-1.5 mt-2 pt-2 text-xs font-medium text-amber-400/90"
                    style={{ borderTop: "1px dashed var(--color-border-subtle)" }}
                  >
                    <UserCheck size={13} className="shrink-0" />
                    <span className="truncate">Cobertura: <strong>{abs.substituteUserName}</strong></span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};