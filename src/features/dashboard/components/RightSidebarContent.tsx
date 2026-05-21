import React, { useEffect, useState } from "react";
import { Tent, PartyPopper, CalendarDays, ChevronLeft } from "lucide-react";
import { scheduleService } from "../api/scheduleService";
import { usersService, type User } from "../../users/api/usersService";
import {
  holidayService,
  type Holiday,
} from "../../settings/api/holidayService";
import type { ScheduleDay } from "../types";

const TEAM_MAP: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };

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

  // 👇 Novo estado para guardar quando o utilizador clica num feriado da lista
  const [clickedHolidayId, setClickedHolidayId] = useState<number | null>(null);

  const today = new Date();
  const monthsPt = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const formattedToday = `${today.getDate()} ${monthsPt[today.getMonth()].slice(0, 3)}`;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const todayMonth = today.getMonth() + 1;
        const todayYear = today.getFullYear();
        const isSameMonth =
          todayYear === viewedYear && todayMonth === viewedMonth;

        // Buscamos as escalas do mês atual (para o painel fixo de Hoje)
        // E do mês que estamos a visualizar (para o painel de feriados)
        const [todayData, viewedData, usersRes, holidaysRes] =
          await Promise.all([
            scheduleService.getEscalaGeral(todayYear, todayMonth),
            isSameMonth
              ? Promise.resolve(null)
              : scheduleService.getEscalaGeral(viewedYear, viewedMonth),
            usersService.getAllUsers().catch(() => []),
            holidayService.getAll().then(res => res.data).catch(() => []),
          ]);

        setTodayShifts(todayData);
        setViewedMonthShifts(viewedData || todayData);
        setUsers(usersRes);
        setHolidays(holidaysRes);
      } catch (error) {
        console.error("Erro ao carregar dados da sidebar:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [viewedMonth, viewedYear]); // Recarrega sempre que mudar de mês

  // Limpa o feriado clicado ao mudar de mês
  useEffect(() => {
    setClickedHolidayId(null);
  }, [viewedMonth, viewedYear]);

  const formatName = (u: User) =>
    u.completeName ? `${u.surname || ""}`.trim() : u.user;

  const getActiveTeam = (shiftNameKey: string, dayShifts: ScheduleDay[]) => {
    const activeShift = dayShifts.find(
      (s) =>
        s.shiftName.normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
        shiftNameKey,
    );
    if (!activeShift) return { letter: "", users: [] };
    return {
      letter: TEAM_MAP[activeShift.letterId] || "?",
      users: users.filter(
        (u) => Number(u.letterId) === Number(activeShift.letterId),
      ),
    };
  };

  // 👇 DADOS DO PAINEL "HOJE" (Usa sempre a data real do sistema)
  const todayDayNum = today.getDate();
  const shiftsForRealToday = todayShifts.filter(
    (s) => parseInt(s.date.split("T")[0].split("-")[2], 10) === todayDayNum,
  );
  const workingUsersToday = users.filter((u) =>
    shiftsForRealToday.find(
      (s) => Number(s.letterId) === Number(u.letterId) && !s.isDayOff,
    ),
  );
  const folgaUsersToday = users.filter((u) =>
    shiftsForRealToday.find(
      (s) => Number(s.letterId) === Number(u.letterId) && s.isDayOff,
    ),
  );

  const manhaToday = getActiveTeam("Manha", shiftsForRealToday);
  const tardeToday = getActiveTeam("Tarde", shiftsForRealToday);
  const noiteToday = getActiveTeam("Noite", shiftsForRealToday);
  const folgaToday = getActiveTeam("Folga", shiftsForRealToday);

  // 👇 LÓGICA DO FERIADO ATIVO (Hover ou Click)
  let activeHolidayToView: Holiday | undefined;
  let activeHolidayShifts: ScheduleDay[] = [];
  let activeHolidayDayNum: number = 0;

  if (hoveredDay) {
    // 1. Prioridade máxima: onde o rato está por cima (Bug Corrigido: usa o viewedMonth!)
    activeHolidayToView = holidays.find((h) => {
      const [hYear, hMonth, hDay] = h.date.split("T")[0].split("-").map(Number);
      return (
        hYear === viewedYear && hMonth === viewedMonth && hDay === hoveredDay
      );
    });
    if (activeHolidayToView) {
      activeHolidayDayNum = hoveredDay;
      activeHolidayShifts = viewedMonthShifts.filter(
        (s) => parseInt(s.date.split("T")[0].split("-")[2], 10) === hoveredDay,
      );
    }
  } else if (clickedHolidayId) {
    // 2. Se o rato não estiver em lado nenhum, vê se algum feriado foi clicado na lista
    activeHolidayToView = holidays.find((h) => h.id === clickedHolidayId);
    if (activeHolidayToView) {
      const [, , hDay] = activeHolidayToView.date
        .split("T")[0]
        .split("-")
        .map(Number);
      activeHolidayDayNum = hDay;
      activeHolidayShifts = viewedMonthShifts.filter(
        (s) => parseInt(s.date.split("T")[0].split("-")[2], 10) === hDay,
      );
    }
  }

  // 👇 Filtra os Feriados apenas do mês que estamos a ver no calendário
  const viewedMonthHolidays = holidays
    .filter((h) => {
      const [hYear, hMonth] = h.date.split("T")[0].split("-").map(Number);
      return hYear === viewedYear && hMonth === viewedMonth;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (isLoading) {
    return (
      <aside className="w-[380px] shrink-0 bg-[#fbf9fa] border-l border-[#efedef] p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#74777d]">
          <div className="w-8 h-8 border-4 border-[#0058be]/20 border-t-[#0058be] rounded-full animate-spin"></div>
          <p className="text-[13px] font-semibold">Carregando dados...</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[380px] shrink-0 bg-[#fbf9fa] border-l border-[#efedef] pl-6 pr-10 py-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
      {/* 1. ESCALA DE HOJE (Fixo) */}
      <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5 text-[#f97316]">
          <Tent size={20} />
          <h3 className="text-[16px] font-bold text-[#041627]">
            Escala de Hoje ({formattedToday})
          </h3>
        </div>

        <div className="bg-[#f8fafc] rounded-[6px] border border-[#efedef] p-4 mb-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[12px] font-semibold text-[#74777d] uppercase tracking-wider">
              Status Geral
            </span>
            <span className="px-2 py-1 bg-[#041627] text-white text-[10px] font-bold uppercase rounded-[4px]">
              Ativo
            </span>
          </div>
          <div className="flex divide-x divide-[#efedef]">
            <div className="flex-1 text-center">
              <p className="text-[24px] font-bold text-[#0058be]">
                {workingUsersToday.length}
              </p>
              <p className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                Trabalhando
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[24px] font-bold text-[#74777d]">
                {folgaUsersToday.length}
              </p>
              <p className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                Folga
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {[
            {
              label: "23h às 07h",
              color: "bg-[#a855f7]",
              text: "text-[#a855f7]",
              data: noiteToday,
            },
            {
              label: "07h às 15h",
              color: "bg-[#f97316]",
              text: "text-[#f97316]",
              data: manhaToday,
            },
            {
              label: "15h às 23h",
              color: "bg-[#3b82f6]",
              text: "text-[#3b82f6]",
              data: tardeToday,
            },
          ].map(
            (turno, idx) =>
              turno.data.letter && (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4
                      className={`text-[12px] font-extrabold uppercase tracking-wide ${turno.text}`}
                    >
                      {turno.label}
                    </h4>
                    <span
                      className={`${turno.color} text-white text-[10px] font-black px-2 py-0.5 rounded-[4px] uppercase tracking-widest shadow-sm`}
                    >
                      Letra {turno.data.letter}
                    </span>
                  </div>
                  <ul className="space-y-2 pl-1">
                    {turno.data.users.length > 0 ? (
                      turno.data.users.map((u) => (
                        <li
                          key={u.userId}
                          className="flex items-center gap-2.5 text-[13px] font-medium text-[#44474c]"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${turno.color} opacity-80 shrink-0`}
                          ></span>
                          <span className="truncate">{formatName(u)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[12px] text-[#74777d] italic pl-4">
                        Nenhum operador atribuído.
                      </li>
                    )}
                  </ul>
                </div>
              ),
          )}

          {folgaToday.letter && (
            <div className="pt-3 border-t border-[#efedef] mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-[12px] font-extrabold text-[#74777d] uppercase tracking-wide">
                  Dia de Folga
                </h4>
                <span className="bg-[#74777d] text-white text-[10px] font-black px-2 py-0.5 rounded-[4px] uppercase tracking-widest shadow-sm">
                  Letra {folgaToday.letter}
                </span>
              </div>
              <ul className="space-y-2 pl-1">
                {folgaToday.users.length > 0 ? (
                  folgaToday.users.map((u) => (
                    <li
                      key={u.userId}
                      className="flex items-center gap-2.5 text-[13px] font-medium text-[#44474c]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c4c6cd] shrink-0"></span>
                      <span className="truncate">{formatName(u)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[12px] text-[#a4a7ad] italic pl-4">
                    Nenhum operador.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 2. AREA INFERIOR DINÂMICA (Feriado Selecionado OU Lista de Feriados) */}
      {activeHolidayToView ? (
        <div className="bg-[#fffbeb] rounded-[8px] border border-[#fde68a] shadow-sm p-5 animate-in slide-in-from-bottom-2 duration-300">
          {/* 👇 Botão Voltar (Só aparece se o painel foi aberto por CLIQUE e o rato não estiver por cima do calendário) */}
          {!hoveredDay && clickedHolidayId && (
            <button
              onClick={() => setClickedHolidayId(null)}
              className="flex items-center text-amber-700 hover:text-amber-900 text-[12px] font-bold mb-4 transition-colors"
            >
              <ChevronLeft size={16} className="mr-0.5" /> Voltar para Lista
            </button>
          )}

          <div className="flex items-center gap-2 mb-4 text-[#d97706]">
            <PartyPopper size={20} />
            <h3 className="text-[16px] font-bold text-[#92400e] leading-tight">
              Feriado Identificado <br />
              <span className="text-[13px] font-medium text-[#d97706]">
                {activeHolidayToView.name}
              </span>
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-[12px] text-[#92400e] font-medium mb-3">
              Equipes escaladas para o dia{" "}
              <span className="font-bold">{activeHolidayDayNum}</span>:
            </p>

            {[
              {
                label: "Noite",
                color: "bg-[#a855f7]",
                text: "text-[#a855f7]",
                data: getActiveTeam("Noite", activeHolidayShifts),
              },
              {
                label: "Manhã",
                color: "bg-[#f97316]",
                text: "text-[#f97316]",
                data: getActiveTeam("Manha", activeHolidayShifts),
              },
              {
                label: "Tarde",
                color: "bg-[#3b82f6]",
                text: "text-[#3b82f6]",
                data: getActiveTeam("Tarde", activeHolidayShifts),
              },
            ].map(
              (turno, idx) =>
                turno.data.letter && (
                  <div
                    key={idx}
                    className="bg-white/60 p-2.5 rounded-[6px] border border-[#fde68a]/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className={`text-[11px] font-extrabold uppercase tracking-wide ${turno.text}`}
                      >
                        {turno.label}
                      </h4>
                      <span
                        className={`${turno.color} text-white text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-widest`}
                      >
                        Eq. {turno.data.letter}
                      </span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {turno.data.users.length > 0 ? (
                        turno.data.users.map((u) => (
                          <li
                            key={u.userId}
                            className="flex items-center gap-2 text-[12px] font-medium text-[#92400e]"
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${turno.color} opacity-80 shrink-0`}
                            ></span>
                            <span className="truncate">{formatName(u)}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[11px] text-[#d97706] italic">
                          Sem operadores.
                        </li>
                      )}
                    </ul>
                  </div>
                ),
            )}
          </div>
        </div>
      ) : (
        /* 👇 NOVA LISTA DE FERIADOS DO MÊS */
        <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm p-5 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays size={18} className="text-[#0058be]" />
            <h3 className="text-[16px] font-bold text-[#041627]">
              Feriados de {monthsPt[viewedMonth - 1]}
            </h3>
          </div>

          <div className="space-y-3">
            {viewedMonthHolidays.length === 0 ? (
              <div className="text-center py-6 bg-[#fbf9fa] border border-dashed border-[#e4e2e3] rounded-[6px]">
                <p className="text-[13px] font-medium text-[#74777d]">
                  Nenhum feriado neste mês.
                </p>
              </div>
            ) : (
              viewedMonthHolidays.map((h) => {
                const [, , hDay] = h.date.split("T")[0].split("-").map(Number);

                return (
                  <div
                    key={h.id}
                    onClick={() => setClickedHolidayId(h.id)}
                    className="flex items-center gap-3 p-2.5 rounded-[6px] border border-[#e4e2e3] hover:border-[#fde68a] hover:bg-[#fffbeb]/50 cursor-pointer transition-all group"
                  >
                    <div className="w-10 h-10 rounded-[4px] bg-[#fbf9fa] border border-[#efedef] flex flex-col items-center justify-center shrink-0 group-hover:bg-[#fef3c7] group-hover:border-[#fde68a] group-hover:text-amber-600 transition-colors">
                      <span className="text-[9px] font-bold uppercase leading-none text-[#74777d] group-hover:text-amber-600 mb-0.5">
                        {monthsPt[viewedMonth - 1].slice(0, 3)}
                      </span>
                      <span className="text-[14px] font-black leading-none text-[#1b1c1d] group-hover:text-amber-600">
                        {hDay}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-[13px] font-bold text-[#1b1c1d] truncate group-hover:text-amber-700">
                        {h.name}
                      </h4>
                      <p className="text-[11px] font-medium text-[#74777d] truncate group-hover:text-amber-600/80">
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
    </aside>
  );
};
