import React, { useEffect, useState } from "react";
import { scheduleService } from "../api/scheduleService";
import {
  holidayService,
  type Holiday,
} from "../../settings/api/holidayService"; // 👇 Importamos a API de feriados
import type { ScheduleDay } from "../types";
import { X, PartyPopper } from "lucide-react";

const TEAM_MAP: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };

const SHIFT_STYLES: Record<
  string,
  { label: string; badge: string; card: string }
> = {
  Noite: {
    label: "23h → 07h",
    badge: "bg-violet-100 text-violet-700",
    card: "bg-violet-50 border-violet-100",
  },
  Manha: {
    label: "07h → 15h",
    badge: "bg-orange-100 text-orange-700",
    card: "bg-orange-50 border-orange-100",
  },
  Tarde: {
    label: "15h → 23h",
    badge: "bg-blue-100 text-blue-700",
    card: "bg-blue-50 border-blue-100",
  },
  Folga: {
    label: "Folga",
    badge: "bg-zinc-200 text-zinc-600",
    card: "bg-zinc-100 border-zinc-200",
  },
};

const SHIFT_ORDER: Record<string, number> = {
  Noite: 1,
  Manha: 2,
  Tarde: 3,
  Folga: 4,
};

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
  const [holidays, setHolidays] = useState<Holiday[]>([]); // 👇 Estado para guardar os feriados
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    if (expandedDay !== null) {
      document.body.style.overflow = "hidden";
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") setExpandedDay(null);
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleEsc);
      };
    }
  }, [expandedDay]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 👇 Promise.all faz as duas requisições ao mesmo tempo, deixando o sistema muito mais rápido!
        const [escalaData, feriadosData] = await Promise.all([
          scheduleService.getEscalaGeral(year, month),
          holidayService.getAll().then(res => res.data).catch(() => []), // Se der erro nos feriados, não quebra a escala
        ]);

        setShifts(escalaData);
        setHolidays(feriadosData);
      } catch (error) {
        console.error("Erro ao carregar os dados do calendário:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [year, month]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const daysInMonthCount = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const weeksCount = Math.ceil((firstDayIndex + daysInMonthCount) / 7);

  const getShiftsForDay = (day: number) => {
    return shifts.filter((shift) => {
      const shiftDay = parseInt(shift.date.split("T")[0].split("-")[2], 10);
      return shiftDay === day;
    });
  };

  return (
    <div className="flex-1 flex flex-col w-full rounded-3xl bg-[#f5f7fb] p-3 pb-6 shadow-inner relative min-h-0">
      <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[12px] font-bold text-zinc-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-zinc-500">
              Carregando escala...
            </span>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-7 gap-2 flex-1 min-h-0"
          style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}
        >
          {/* ESPAÇOS VAZIOS */}
          {Array.from({ length: firstDayIndex }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="rounded-[14px] bg-black/[0.01]"
            />
          ))}

          {/* DIAS REAIS */}
          {Array.from({ length: daysInMonthCount }).map((_, i) => {
            const day = i + 1;
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() + 1 &&
              year === new Date().getFullYear();

            // 👇 Verificação: Este dia é feriado?
            const currentHoliday = holidays.find((h) => {
              // Pegamos o YYYY-MM-DD com segurança para evitar problemas de fuso horário
              const [hYear, hMonth, hDay] = h.date
                .split("T")[0]
                .split("-")
                .map(Number);
              return hYear === year && hMonth === month && hDay === day;
            });

            const dayShifts = getShiftsForDay(day).sort((a, b) => {
              const nameA = a.shiftName
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              const nameB = b.shiftName
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              return (SHIFT_ORDER[nameA] || 99) - (SHIFT_ORDER[nameB] || 99);
            });

            return (
              <div
                key={day}
                onClick={() => setExpandedDay(day)}
                onMouseEnter={() => onDayHover && onDayHover(day)}
                onMouseLeave={() => onDayHover && onDayHover(null)}
                className={`
                  rounded-[12px] border bg-white py-1.5 px-2 flex flex-col overflow-hidden cursor-pointer
                  transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-200
                  ${isToday ? "border-blue-500 shadow-blue-100 shadow-sm bg-[#fcfdff]" : currentHoliday ? "border-amber-200 bg-[#fffbeb]/30" : "border-zinc-200"}
                `}
              >
                {/* 👇 TOPO DO DIA COM IDENTIFICAÇÃO DO FERIADO */}
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div
                      className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[12px] font-extrabold 
                        ${isToday ? "bg-blue-600 text-white" : currentHoliday ? "bg-amber-500 text-white shadow-sm" : "bg-zinc-100 text-zinc-700"}
                      `}
                    >
                      {day}
                    </div>

                    {/* Se for feriado e NÃO for o dia de hoje, exibe o nome do feriado na célula */}
                    {currentHoliday && !isToday && (
                      <span
                        className="text-[9px] font-extrabold text-amber-600 truncate max-w-[55px] sm:max-w-[70px]"
                        title={currentHoliday.name}
                      >
                        {currentHoliday.name}
                      </span>
                    )}
                  </div>

                  {isToday && (
                    <div className="text-[9px] font-bold tracking-wide text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase shrink-0">
                      Hoje
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-[3px] flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {dayShifts.map((shift) => {
                    const normalizedName = shift.shiftName
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "");
                    const shiftStyle =
                      SHIFT_STYLES[normalizedName] || SHIFT_STYLES["Folga"];
                    const teamName = TEAM_MAP[shift.letterId] || "?";

                    const isFaded =
                      selectedTeam !== null && shift.letterId !== selectedTeam;

                    return (
                      <div
                        key={shift.id}
                        className={`rounded-md border px-1.5 py-[3px] shrink-0 transition-all duration-300 ${shiftStyle.card} ${isFaded ? "opacity-35 grayscale" : "opacity-100"}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div
                            className={`text-[9.5px] font-bold px-1.5 py-[1px] rounded whitespace-nowrap tracking-tight transition-all ${shiftStyle.badge} ${isFaded ? "bg-zinc-100 text-zinc-500" : ""}`}
                          >
                            {shiftStyle.label}
                          </div>
                          <div
                            className={`text-[10.5px] font-bold whitespace-nowrap pr-0.5 transition-all ${isFaded ? "text-zinc-400" : "text-zinc-700"}`}
                          >
                            Eq. {teamName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {dayShifts.length === 0 && (
                    <div
                      className={`text-center text-[10px] font-medium py-1 ${currentHoliday ? "text-amber-500/70" : "text-zinc-400"}`}
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

      {/* MODAL LIGHTBOX */}
      {expandedDay !== null &&
        (() => {
          const isTodayModal =
            expandedDay === new Date().getDate() &&
            month === new Date().getMonth() + 1 &&
            year === new Date().getFullYear();

          const modalHoliday = holidays.find((h) => {
            const [hYear, hMonth, hDay] = h.date
              .split("T")[0]
              .split("-")
              .map(Number);
            return hYear === year && hMonth === month && hDay === expandedDay;
          });

          const modalShifts = getShiftsForDay(expandedDay).sort((a, b) => {
            const nameA = a.shiftName
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            const nameB = b.shiftName
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            return (SHIFT_ORDER[nameA] || 99) - (SHIFT_ORDER[nameB] || 99);
          });

          const dateObj = new Date(year, month - 1, expandedDay);
          const diaDaSemana = dateObj.toLocaleDateString("pt-BR", {
            weekday: "long",
          });

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setExpandedDay(null)}
              ></div>

              <div className="relative w-full max-w-[340px] rounded-[24px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.1)] transform transition-all animate-in zoom-in-95 duration-200">
                <button
                  onClick={() => setExpandedDay(null)}
                  className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-sm ${isTodayModal ? "bg-blue-600 text-white" : modalHoliday ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-700"}`}
                  >
                    {expandedDay}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-zinc-800 capitalize flex items-center gap-1.5">
                      {diaDaSemana}{" "}
                      {modalHoliday && (
                        <PartyPopper size={14} className="text-amber-500" />
                      )}
                    </h3>
                    <p className="text-[13px] font-medium text-zinc-500 mt-0.5">
                      {isTodayModal ? (
                        <span className="text-blue-600 font-bold">Hoje</span>
                      ) : modalHoliday ? (
                        <span className="text-amber-600 font-bold">
                          {modalHoliday.name}
                        </span>
                      ) : (
                        `Escala completa do dia`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {modalShifts.map((shift) => {
                    const normalizedName = shift.shiftName
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "");
                    const shiftStyle =
                      SHIFT_STYLES[normalizedName] || SHIFT_STYLES["Folga"];
                    const teamName = TEAM_MAP[shift.letterId] || "?";
                    const isFaded =
                      selectedTeam !== null && shift.letterId !== selectedTeam;

                    return (
                      <div
                        key={shift.id}
                        className={`rounded-2xl border px-4 py-3.5 shadow-sm transition-all duration-300 ${shiftStyle.card} ${isFaded ? "opacity-35 grayscale" : "opacity-100"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className={`text-[12px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${shiftStyle.badge} ${isFaded ? "bg-zinc-100 text-zinc-500" : ""}`}
                          >
                            {shiftStyle.label}
                          </div>
                          <div
                            className={`text-[14px] font-extrabold transition-all ${isFaded ? "text-zinc-400" : "text-zinc-800"}`}
                          >
                            Equipe {teamName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {modalShifts.length === 0 && (
                    <div className="text-center text-sm font-medium text-zinc-400 py-6">
                      Nenhuma escala atribuída.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
