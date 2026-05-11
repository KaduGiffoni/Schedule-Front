import React, { useEffect, useState } from "react";
import { BedDouble, Coffee, Tent } from "lucide-react";
import { scheduleService } from "../api/scheduleService";
import { usersService, type User } from "../../users/api/usersService"; // 👇 Usando o serviço correto!
import type { ScheduleDay } from "../types";

const TEAM_MAP: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };

export const RightSidebarContent = () => {
  const [todayShifts, setTodayShifts] = useState<ScheduleDay[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();
  const monthsPt = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const formattedToday = `${today.getDate()} ${monthsPt[today.getMonth()]}`;

  useEffect(() => {
    const fetchTodayData = async () => {
      setIsLoading(true);
      try {
        const shiftsData = await scheduleService.getEscalaGeral(
          2026,
          today.getMonth() + 1,
        );
        const todayDayNum = today.getDate();
        const shiftsForToday = shiftsData.filter((s) => {
          const shiftDay = parseInt(s.date.split("T")[0].split("-")[2], 10);
          return shiftDay === todayDayNum;
        });
        setTodayShifts(shiftsForToday);

        // Busca pela Service oficial que você já construiu!
        try {
          const usersRes = await usersService.getAllUsers();
          setUsers(usersRes);
        } catch (apiError) {
          console.error("Erro ao carregar usuários da API", apiError);
          setUsers([]);
        }
      } catch (error) {
        console.error("Erro ao carregar a escala:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayData();
  }, []);

  // 👇 Dica Sênior: Função auxiliar para formatar perfeitamente o nome e sobrenome
  const formatName = (u: User) => {
    if (u.completeName) {
      return `${u.completeName} ${u.surname || ""}`.trim();
    }
    return u.user; // Se não tiver nome, mostra o email
  };

  // 👇 Uso do Number() para garantir que tipos diferentes (String '1' e Num 1) combinem!
  const workingUsers = users.filter((u) => {
    const shift = todayShifts.find(
      (s) => Number(s.letterId) === Number(u.letterId),
    );
    return shift && !shift.isDayOff;
  });

  const folgaUsers = users.filter((u) => {
    const shift = todayShifts.find(
      (s) => Number(s.letterId) === Number(u.letterId),
    );
    return shift && shift.isDayOff;
  });

  const getActiveTeamForShift = (shiftNameKey: string) => {
    const activeShift = todayShifts.find(
      (s) =>
        s.shiftName.normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
        shiftNameKey,
    );

    if (!activeShift) return { letter: "", users: [] };

    return {
      letter: TEAM_MAP[activeShift.letterId] || "?",
      // 👇 Novamente o Number() a salvar-nos de bugs invisíveis
      users: users.filter(
        (u) => Number(u.letterId) === Number(activeShift.letterId),
      ),
    };
  };

  const manhaData = getActiveTeamForShift("Manha");
  const tardeData = getActiveTeamForShift("Tarde");
  const noiteData = getActiveTeamForShift("Noite");
  const folgaData = getActiveTeamForShift("Folga");

  if (isLoading) {
    return (
      <aside className="w-[380px] shrink-0 bg-[#fbf9fa] border-l border-[#efedef] p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#74777d]">
          <div className="w-8 h-8 border-4 border-[#0058be]/20 border-t-[#0058be] rounded-full animate-spin"></div>
          <p className="text-[13px] font-semibold">
            Carregando equipes de hoje...
          </p>
        </div>
      </aside>
    );
  }

  return (
    // 👇 Aumentámos a largura (w-[380px]), fixámos a largura (shrink-0) e o padding na direita (pr-10)
    <aside className="w-[380px] shrink-0 bg-[#fbf9fa] border-l border-[#efedef] pl-6 pr-10 py-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
      {/* Card 1: Escala no Feriado / Hoje */}
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
                {workingUsers.length}
              </p>
              <p className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                Trabalhando
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[24px] font-bold text-[#74777d]">
                {folgaUsers.length}
              </p>
              <p className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                Folga
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Equipe Noite (Começa às 23h) */}
          {noiteData.letter && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-[12px] font-extrabold text-[#a855f7] uppercase tracking-wide">
                  23h às 07h
                </h4>
                <span className="bg-[#a855f7] text-white text-[10px] font-black px-2 py-0.5 rounded-[4px] uppercase tracking-widest shadow-sm">
                  Letra {noiteData.letter}
                </span>
              </div>
              <ul className="space-y-2 pl-1">
                {noiteData.users.length > 0 ? (
                  noiteData.users.map((u) => (
                    <li
                      key={u.userId}
                      className="flex items-center gap-2.5 text-[13px] font-medium text-[#44474c]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] opacity-80 shrink-0"></span>
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
          )}

          {/* Equipe Manhã */}
          {manhaData.letter && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-[12px] font-extrabold text-[#f97316] uppercase tracking-wide">
                  07h às 15h
                </h4>
                <span className="bg-[#f97316] text-white text-[10px] font-black px-2 py-0.5 rounded-[4px] uppercase tracking-widest shadow-sm">
                  Letra {manhaData.letter}
                </span>
              </div>
              <ul className="space-y-2 pl-1">
                {manhaData.users.length > 0 ? (
                  manhaData.users.map((u) => (
                    <li
                      key={u.userId}
                      className="flex items-center gap-2.5 text-[13px] font-medium text-[#44474c]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] opacity-80 shrink-0"></span>
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
          )}

          {/* Equipe Tarde */}
          {tardeData.letter && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-[12px] font-extrabold text-[#3b82f6] uppercase tracking-wide">
                  15h às 23h
                </h4>
                <span className="bg-[#3b82f6] text-white text-[10px] font-black px-2 py-0.5 rounded-[4px] uppercase tracking-widest shadow-sm">
                  Letra {tardeData.letter}
                </span>
              </div>
              <ul className="space-y-2 pl-1">
                {tardeData.users.length > 0 ? (
                  tardeData.users.map((u) => (
                    <li
                      key={u.userId}
                      className="flex items-center gap-2.5 text-[13px] font-medium text-[#44474c]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] opacity-80 shrink-0"></span>
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
          )}

          {/* Equipe de Folga */}
          {folgaData.letter && (
            <div className="pt-3 border-t border-[#efedef] mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-[12px] font-extrabold text-[#74777d] uppercase tracking-wide">
                  Dia de Folga
                </h4>
                <span className="bg-[#74777d] text-white text-[10px] font-black px-2 py-0.5 rounded-[4px] uppercase tracking-widest shadow-sm">
                  Letra {folgaData.letter}
                </span>
              </div>
              <ul className="space-y-2 pl-1">
                {folgaData.users.length > 0 ? (
                  folgaData.users.map((u) => (
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
                    Nenhum operador atribuído.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Legenda de Descanso */}
      <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm p-5">
        <h3 className="text-[16px] font-bold text-[#041627] mb-5">
          Legenda de Descanso
        </h3>

        <div className="space-y-4 mb-6">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-[4px] border border-[#c4c6cd] flex items-center justify-center text-[#44474c] shrink-0 bg-[#f5f3f4]">
              <BedDouble size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#041627]">Folga 80h</p>
              <p className="text-[12px] text-[#74777d] mt-0.5 leading-relaxed">
                Descanso longo obrigatório após ciclo de 4 noites consecutivas.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-[4px] border border-[#c4c6cd] flex items-center justify-center text-[#44474c] shrink-0 bg-[#f5f3f4]">
              <Coffee size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#041627]">Folga 24h</p>
              <p className="text-[12px] text-[#74777d] mt-0.5 leading-relaxed">
                Descanso curto de transição após o ciclo de tarde.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-[#74777d] uppercase tracking-wider mb-2">
            Lógica de Rotação (4x4x80x4x24)
          </p>
          <div className="flex gap-1 h-2">
            <div
              className="w-2/6 bg-[#f97316] rounded-l-full"
              title="4 Dias Manhã"
            ></div>
            <div className="w-2/6 bg-[#a855f7]" title="4 Dias Noite"></div>
            <div className="w-1/6 bg-[#dbd9db]" title="Folga 80h"></div>
            <div className="w-2/6 bg-[#3b82f6]" title="4 Dias Tarde"></div>
            <div
              className="w-1/6 bg-[#efedef] rounded-r-full"
              title="Folga 24h"
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-semibold text-[#74777d] uppercase">
              Dia 1
            </span>
            <span className="text-[9px] font-semibold text-[#74777d] uppercase">
              Dia 16
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
