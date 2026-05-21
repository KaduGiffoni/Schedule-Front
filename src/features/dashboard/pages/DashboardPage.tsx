
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RightSidebarContent } from "../components/RightSidebarContent";
import { CalendarGrid } from "../components/CalendarGrid";

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const monthNames = [
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

  const handlePrevMonth = () =>
    setCurrentMonth((prev) => (prev === 1 ? 12 : prev - 1));
  const handleNextMonth = () =>
    setCurrentMonth((prev) => (prev === 12 ? 1 : prev + 1));

  return (
    <div className="flex-1 flex overflow-hidden bg-[#fbf9fa] h-full w-full font-sans text-[#1b1c1d]">
      <main className="flex-1 overflow-y-auto p-8 pb-16 flex flex-col">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex gap-4">
            <button className="text-[14px] font-bold text-[#0058be] border-b-2 border-[#0058be] pb-2">
              Escala Completa
            </button>
            <button className="text-[14px] font-medium text-[#74777d] pb-2 hover:text-[#1b1c1d] transition-colors">
              Minha Escala
            </button>
          </div>

          <div className="flex items-center gap-2 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
            Filtrar Equipe:
            <div className="flex border border-[#e4e2e3] rounded-[6px] overflow-hidden bg-white ml-2 shadow-sm">
              <button
                onClick={() => setSelectedTeam(null)}
                className={`px-3 py-1.5 border-r border-[#e4e2e3] text-[13px] font-bold transition-colors ${
                  selectedTeam === null
                    ? "bg-[#0058be] text-white"
                    : "text-[#44474c] hover:bg-[#f5f3f4]"
                }`}
              >
                TODAS
              </button>

              {[
                { id: 1, letter: "A" },
                { id: 2, letter: "B" },
                { id: 3, letter: "C" },
                { id: 4, letter: "D" },
              ].map((team) => (
                <button
                  key={team.letter}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`px-3 py-1.5 border-r border-[#e4e2e3] last:border-0 text-[13px] font-bold transition-colors ${
                    selectedTeam === team.id
                      ? "bg-[#0058be] text-white"
                      : "text-[#44474c] hover:bg-[#f5f3f4]"
                  }`}
                >
                  {team.letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-[24px] font-extrabold text-[#041627] tracking-tight">
              {monthNames[currentMonth - 1]} de {currentYear}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-[#74777d] hover:text-[#1b1c1d] hover:bg-[#efedef] rounded-[4px] transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-[#74777d] hover:text-[#1b1c1d] hover:bg-[#efedef] rounded-[4px] transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* 👇 Legenda do Calendário Atualizada (Reflete perfeitamente a image_f37432.png) */}
          <div className="flex gap-4 text-[12px] font-semibold text-[#44474c] bg-white px-4 py-2 rounded-[8px] border border-[#e4e2e3] shadow-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffdad6] border border-[#ba1a1a]/20"></span>{" "}
              Manhã (07-15h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d3e3fd] border border-[#004a77]/20"></span>{" "}
              Tarde (15-23h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eaddff] border border-[#4f378b]/20"></span>{" "}
              Noite (23-07h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f5f3f4] border border-[#74777d]/20"></span>{" "}
              Folga (80h)
            </span>
          </div>
        </div>

        {/* Container do Calendário */}
        <div className="flex-1 min-h-0 flex flex-col mb-8">
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            selectedTeam={selectedTeam}
            onDayHover={setHoveredDay}
          />
        </div>
      </main>

      {/* Sidebar Direita Funcional com o novo raio arredondado */}
      <aside className="w-[380px] bg-white border-l border-[#e4e2e3] shadow-[-4px_0_24px_rgba(0,0,0,0.01)] z-10 overflow-y-auto shrink-0">
        <RightSidebarContent
          hoveredDay={hoveredDay}
          viewedMonth={currentMonth}
          viewedYear={currentYear}
        />
      </aside>
    </div>
  );
}
