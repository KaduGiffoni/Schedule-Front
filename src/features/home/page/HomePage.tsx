import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Plus,
  ShieldAlert,
  Tent,
  CalendarDays,
} from "lucide-react";

import { Button } from "../../../components/ui/Button";
import { InputField } from "../../../components/ui/InputField";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { Modal } from "../../../components/ui/Modal";
import { scheduleService } from "../../dashboard/api/scheduleService";
import type { ScheduleDay } from "../../dashboard/types";
import { noticesService } from "../../notices/api/noticesService";
import type { Notice } from "../../notices/types";
import {
  type Holiday,
  holidayService,
} from "../../settings/api/holidayService";
import { usersService } from "../../users/api/usersService";
import type { UserProfile } from "../../auth/types";
import { useToastStore } from "../../../lib/toastStore";

const TEAM_MAP: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };

export default function DashboardHome() {
  const showToast = useToastStore((state) => state.showToast);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para os Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: "",
    type: "Turno" as "Geral" | "Turno",
    content: "",
  });

  const [weeklyShifts, setWeeklyShifts] = useState<ScheduleDay[]>([]);
  const [systemUsers, setSystemUsers] = useState<
    (Omit<UserProfile, "letterId"> & { letterId: number | null })[]
  >([]);
  const [monthHolidays, setMonthHolidays] = useState<Holiday[]>([]);

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getDaysOfCurrentWeek = (offset: number) => {
    const days = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + offset * 7);

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      days.push(currentDay);
    }
    return days;
  };

  const weekDays = getDaysOfCurrentWeek(currentWeekOffset);

  const fetchDashboardData = async () => {
    try {
      const startYear = weekDays[0].getFullYear();
      const startMonth = weekDays[0].getMonth() + 1;
      const endYear = weekDays[6].getFullYear();
      const endMonth = weekDays[6].getMonth() + 1;

      const [
        boardRes,
        usersRes,
        holidaysRes,
        scaleStartRes,
        scaleEndRes,
      ]: any[] = await Promise.all([
        noticesService.getMyBoard().catch(() => []),
        usersService.getAllUsers().catch(() => []),
        holidayService
          .getAll()
          .then((res) => res.data)
          .catch(() => []),
        scheduleService.getEscalaGeral(startYear, startMonth).catch(() => []),
        startMonth === endMonth
          ? Promise.resolve([])
          : scheduleService.getEscalaGeral(endYear, endMonth).catch(() => []),
      ]);

      const extractedNotices = Array.isArray(boardRes)
        ? boardRes
        : boardRes?.data || [];
      setNotices(extractedNotices);

      const extractedUsers = Array.isArray(usersRes)
        ? usersRes
        : usersRes?.data || [];
      setSystemUsers(extractedUsers);

      const extractedHolidays = Array.isArray(holidaysRes)
        ? holidaysRes
        : holidaysRes?.data || [];
      setMonthHolidays(extractedHolidays);

      const startScale = Array.isArray(scaleStartRes)
        ? scaleStartRes
        : scaleStartRes?.data || [];
      const endScale = Array.isArray(scaleEndRes)
        ? scaleEndRes
        : scaleEndRes?.data || [];

      const combinedScale = [...startScale];
      endScale.forEach((dayEnd: ScheduleDay) => {
        if (
          !combinedScale.some(
            (dayStart) =>
              dayStart.date.split("T")[0] === dayEnd.date.split("T")[0],
          )
        ) {
          combinedScale.push(dayEnd);
        }
      });
      setWeeklyShifts(combinedScale);
    } catch (error) {
      console.error("Erro ao sincronizar Cockpit", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentWeekOffset]);

  const handleAcknowledge = async (id: number) => {
    try {
      await noticesService.acknowledgeNotice(id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
      showToast("Ciência confirmada com sucesso.", "success");
    } catch (error) {
      showToast("Erro ao processar confirmação.", "error");
    }
  };

  const handleAddComment = async (e: React.FormEvent, noticeId: number) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await noticesService.addComment(noticeId, commentText);
      setCommentText("");
      setIsCommentModalOpen(false); // Fecha o modal após enviar
      await fetchDashboardData();
      showToast("Atualização adicionada com sucesso.", "success");
    } catch (error) {
      showToast("Erro ao postar atualização.", "error");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const isContentEmpty =
      !newNotice.content || newNotice.content === "<p></p>";

    if (!newNotice.title) {
      showToast("Preencha o título.", "error");
      return;
    }
    if (isContentEmpty) {
      showToast("Digite o conteúdo.", "error");
      return;
    }

    setIsSavingNotice(true);
    try {
      await noticesService.createNotice(newNotice);
      setIsModalOpen(false);
      setNewNotice({ title: "", type: "Turno", content: "" });
      setCurrentIndex(0);
      await fetchDashboardData();
      showToast("Mensagem publicada com sucesso.", "success");
    } catch (error: any) {
      showToast("Erro ao publicar a mensagem.", "error");
    } finally {
      setIsSavingNotice(false);
    }
  };

  const activeNotice = notices[currentIndex];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg)] h-full w-full">
        <div className="w-8 h-8 border-4 border-[var(--color-accent-subtle)] border-t-[var(--color-accent)] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[var(--color-bg)] overflow-x-hidden overflow-y-auto p-6 flex flex-col gap-6 w-full font-sans text-[var(--color-text)] min-h-screen">
      {/* 1. MURAL EXPANDIDO E ALINHADO */}
      <div className="bg-[var(--color-surface)] rounded-[8px] border border-[var(--color-border)] shadow-sm flex flex-col w-full shrink-0">
        {/* Cabeçalho do Mural */}
        <div className="p-5 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-[var(--color-surface-dim)] rounded-t-[8px]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-[var(--color-accent)]" size={20} />
            <h2 className="text-[18px] font-bold text-[var(--color-text)] tracking-tight">
              Quadro Técnico Ativo ({notices.length} pendentes)
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="h-9 px-4 text-[12px] bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] font-bold uppercase tracking-wide shadow-sm"
            >
              <Plus size={14} className="mr-1.5" /> Nova Mensagem
            </Button>

            {/* Navegação de Carrossel Arrumada (Horizontal) */}
            {notices.length > 1 && (
              <div className="flex items-center border border-[var(--color-border)] rounded-[6px] bg-[var(--color-surface)] shadow-sm h-9 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  disabled={currentIndex === 0}
                  className="w-9 h-9 flex items-center justify-center hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] disabled:opacity-30 transition"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="min-w-[58px] h-9 flex items-center justify-center border-x border-[var(--color-border)] text-[12px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg)]">
                  {currentIndex + 1} / {notices.length}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((p) => Math.min(notices.length - 1, p + 1))
                  }
                  disabled={currentIndex === notices.length - 1}
                  className="w-9 h-9 flex items-center justify-center hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] disabled:opacity-30 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Corpo do Mural Unificado */}
        {activeNotice ? (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-[4px] text-[var(--color-accent-text)] shadow-xs ${activeNotice.type === "Turno" ? "bg-purple-600 dark:bg-purple-800" : "bg-[var(--color-accent)]"}`}
              >
                {activeNotice.type}
              </span>
              <h3 className="text-[20px] font-extrabold text-[var(--color-text)] leading-tight">
                {activeNotice.title}
              </h3>
            </div>

            <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)] font-medium mb-6 bg-[var(--color-surface-dim)] p-2 px-3 rounded-[6px] border border-[var(--color-border-subtle)] w-fit">
              <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                Por:{" "}
                <b className="text-[var(--color-text)]">
                  {activeNotice.createdByUserName}
                </b>
              </span>
              <span className="text-[var(--color-text-faint)]">•</span>
              <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                {new Date(activeNotice.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>

            {/* Conteúdo Principal com limite flexível para não quebrar layout */}
            <div
              className="text-[14px] text-[var(--color-text-muted)] border-l-4 border-[var(--color-border)] pl-4 italic font-medium prose prose-sm max-w-none mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2"
              dangerouslySetInnerHTML={{ __html: activeNotice.content }}
            />

            {/* Comentários Integrados abaixo do quadro */}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCommentModalOpen(true)}
                className="flex items-center gap-2 h-11 px-5 border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] font-bold text-[13px] rounded-[4px] uppercase tracking-wide transition-colors"
              >
                <Plus size={16} />
                Adicionar Atualização
              </button>

              <button
                onClick={() => handleAcknowledge(activeNotice.id)}
                className="flex items-center gap-2 h-11 px-8 bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-white font-bold text-[14px] rounded-[4px] uppercase tracking-wider transition-colors shadow-sm"
              >
                <CheckCircle2 size={18} />
                Confirma Ciência
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-[var(--color-success-subtle)] text-[var(--color-success)] rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-[18px] font-bold text-[var(--color-text)]">
              Mural 100% Atualizado!
            </h4>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
              Todas as passagens e avisos foram visualizados.
            </p>
          </div>
        )}
      </div>

      {/* 2. CALENDÁRIO SEMANAL DE PONTA A PONTA (MIDDLE) - Agora não some! */}
      <div className="bg-[var(--color-surface)] rounded-[8px] border border-[var(--color-border)] shadow-sm flex flex-col overflow-hidden w-full shrink-0">
        <div className="flex justify-between items-center p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-dim)]">
          <div className="flex items-center gap-2">
            <Calendar className="text-[var(--color-accent)]" size={18} />
            <h3 className="text-[15px] font-bold text-[var(--color-text)] uppercase tracking-wide">
              Escala Semanal
            </h3>
          </div>

          <div className="hidden md:flex gap-4 text-[11px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg)] px-4 py-2 rounded-[6px] border border-[var(--color-border)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-shift-night-bg)] border border-[var(--color-shift-night)]"></span>{" "}
              Noite (23-07h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-shift-morning-bg)] border border-[var(--color-shift-morning)]"></span>{" "}
              Manhã (07-15h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-shift-afternoon-bg)] border border-[var(--color-shift-afternoon)]"></span>{" "}
              Tarde (15-23h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-shift-dayoff-bg)] border border-[var(--color-shift-dayoff)]"></span>{" "}
              Folga
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded border border-[var(--color-border)] shadow-xs">
            <button
              onClick={() => setCurrentWeekOffset((o) => o - 1)}
              className="p-1 rounded hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-bold px-2 uppercase tracking-wider text-[var(--color-text-muted)]">
              Semanas
            </span>
            <button
              onClick={() => setCurrentWeekOffset((o) => o + 1)}
              className="p-1 rounded hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 gap-4 pb-3">
            {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((d) => (
              <div
                key={d}
                className="text-center text-[12px] font-bold text-[var(--color-text-faint)]"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day, idx) => {
              const isSelected =
                selectedDate.toDateString() === day.toDateString();
              const isToday = new Date().toDateString() === day.toDateString();

              const isoStr = day.toISOString().split("T")[0];
              const dayShifts = weeklyShifts.filter(
                (s) => s.date.split("T")[0] === isoStr,
              );

              const getTeam = (keyword: string) => {
                const shift = dayShifts.find((s) =>
                  s.shiftName
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .includes(keyword),
                );
                return shift ? TEAM_MAP[shift.letterId] || "?" : null;
              };

              const eqNoite = getTeam("noite");
              const eqManha = getTeam("manha");
              const eqTarde = getTeam("tarde");
              const eqFolga = getTeam("folga");

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`rounded-[8px] border cursor-pointer transition-all p-3 flex flex-col min-h-[140px]
                    ${
                      isToday
                        ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)] shadow-sm bg-[var(--color-surface)]"
                        : isSelected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-subtle)] hover:shadow-xs hover:bg-[var(--color-surface-raised)]"
                    }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={`text-[18px] font-black leading-none ${isToday ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"}`}
                    >
                      {day.getDate()}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold text-[var(--color-accent)] uppercase bg-[var(--color-accent-subtle)] px-1.5 py-0.5 rounded">
                        Hoje
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mt-auto">
                    {eqNoite && (
                      <div className="flex justify-between items-center bg-[var(--color-shift-night-bg)] text-[var(--color-shift-night)] px-2 py-1.5 rounded-[4px] text-[11px] font-bold">
                        <span>23h – 07h</span>
                        <span>Eq. {eqNoite}</span>
                      </div>
                    )}
                    {eqManha && (
                      <div className="flex justify-between items-center bg-[var(--color-shift-morning-bg)] text-[var(--color-shift-morning)] px-2 py-1.5 rounded-[4px] text-[11px] font-bold">
                        <span>07h – 15h</span>
                        <span>Eq. {eqManha}</span>
                      </div>
                    )}
                    {eqTarde && (
                      <div className="flex justify-between items-center bg-[var(--color-shift-afternoon-bg)] text-[var(--color-shift-afternoon)] px-2 py-1.5 rounded-[4px] text-[11px] font-bold">
                        <span>15h – 23h</span>
                        <span>Eq. {eqTarde}</span>
                      </div>
                    )}
                    {eqFolga && (
                      <div className="flex justify-between items-center bg-[var(--color-shift-dayoff-bg)] text-[var(--color-shift-dayoff)] border border-[var(--color-shift-dayoff-bg)] px-2 py-1.5 rounded-[4px] text-[11px] font-bold">
                        <span>Folga</span>
                        <span>Eq. {eqFolga}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. RODAPÉ DIVIDIDO E COMPACTO (BOTTOM) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full shrink-0">
        {/* Lado Esquerdo: Escala de Hoje - Versão Super Compacta */}
        <div className="bg-[var(--color-surface)] rounded-[8px] border border-[var(--color-border)] shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4 text-[var(--color-shift-morning)] border-b border-[var(--color-border-subtle)] pb-3">
            <Tent size={18} />
            <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wide">
              Escala de Plantão ({selectedDate.getDate()} de{" "}
              {selectedDate.toLocaleString("pt-BR", { month: "short" })})
            </h3>
          </div>

          {(() => {
            const selIsoStr = selectedDate.toISOString().split("T")[0];
            const selShifts = weeklyShifts.filter(
              (s) => s.date.split("T")[0] === selIsoStr,
            );

            const getShiftData = (keyword: string) => {
              const shift = selShifts.find((s) =>
                s.shiftName
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .includes(keyword),
              );
              if (!shift) return null;
              return {
                letter: TEAM_MAP[shift.letterId] || "?",
                users: systemUsers.filter(
                  (u) => Number(u.letterId) === Number(shift.letterId),
                ),
              };
            };

            const nData = getShiftData("noite");
            const mData = getShiftData("manha");
            const tData = getShiftData("tarde");
            const fData = getShiftData("folga");

            return (
              <div className="space-y-4">
                {nData && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-shift-night)]">
                        23H ÀS 07H
                      </h4>
                      <span className="bg-[var(--color-shift-night)] text-white text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase shadow-sm">
                        Letra {nData.letter}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 pl-1">
                      {nData.users.map((u) => (
                        <li
                          key={u.userId}
                          className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-muted)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-shift-night)]"></span>{" "}
                          {u.completeName || u.user}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {mData && (
                  <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-shift-morning)]">
                        07H ÀS 15H
                      </h4>
                      <span className="bg-[var(--color-shift-morning)] text-white text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase shadow-sm">
                        Letra {mData.letter}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 pl-1">
                      {mData.users.map((u) => (
                        <li
                          key={u.userId}
                          className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-muted)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-shift-morning)]"></span>{" "}
                          {u.completeName || u.user}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tData && (
                  <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-shift-afternoon)]">
                        15H ÀS 23H
                      </h4>
                      <span className="bg-[var(--color-shift-afternoon)] text-white text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase shadow-sm">
                        Letra {tData.letter}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 pl-1">
                      {tData.users.map((u) => (
                        <li
                          key={u.userId}
                          className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-muted)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-shift-afternoon)]"></span>{" "}
                          {u.completeName || u.user}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fData && (
                  <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-shift-dayoff)]">
                        Dia de Folga
                      </h4>
                      <span className="bg-[var(--color-shift-dayoff)] text-white text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase shadow-sm">
                        Letra {fData.letter}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 pl-1">
                      {fData.users.map((u) => (
                        <li
                          key={u.userId}
                          className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-muted)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-shift-dayoff)]"></span>{" "}
                          {u.completeName || u.user}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Lado Direito: Feriados */}
        <div className="bg-[var(--color-surface)] rounded-[8px] border border-[var(--color-border)] shadow-sm p-4 h-fit">
          <div className="flex items-center gap-2 mb-4 border-b border-[var(--color-border-subtle)] pb-3">
            <CalendarDays size={18} className="text-[var(--color-accent)]" />
            <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wide">
              Feriados do Mês
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {monthHolidays.filter(
              (h) => new Date(h.date).getMonth() === selectedDate.getMonth(),
            ).length === 0 ? (
              <p className="text-[12px] text-[var(--color-text-faint)] italic">
                Nenhum feriado previsto para este mês.
              </p>
            ) : (
              monthHolidays
                .filter(
                  (h) =>
                    new Date(h.date).getMonth() === selectedDate.getMonth(),
                )
                .map((h) => {
                  const hDate = new Date(h.date);
                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 p-2.5 rounded-[6px] border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface-dim)] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-[4px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex flex-col items-center justify-center shrink-0 shadow-xs">
                        <span className="text-[9px] font-bold uppercase leading-none text-[var(--color-accent)] mb-1">
                          {hDate
                            .toLocaleString("pt-BR", { month: "short" })
                            .replace(".", "")}
                        </span>
                        <span className="text-[14px] font-black leading-none text-[var(--color-text)]">
                          {hDate.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="text-[13px] font-bold text-[var(--color-text)] truncate">
                          {h.name}
                        </h4>
                        <p className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">
                          {h.type}
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Modal Principal (Nova Mensagem) */}
      {isModalOpen && (
        <Modal
          onClose={() => setIsModalOpen(false)}
          title="Registrar Ocorrência / Aviso"
          size="lg"
        >
          <form onSubmit={handleCreateNotice} className="flex flex-col gap-5 mt-2">
            <InputField
              label="Título"
              id="title"
              required
              value={newNotice.title}
              onChange={(e) =>
                setNewNotice({ ...newNotice, title: e.target.value })
              }
            />
            <select
              className="w-full h-[40px] px-3 text-[14px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[4px] text-[var(--color-text)]"
              value={newNotice.type}
              onChange={(e) =>
                setNewNotice({
                  ...newNotice,
                  type: e.target.value as "Geral" | "Turno",
                })
              }
            >
              <option value="Turno">Passagem de Turno</option>
              <option value="Geral">Aviso Geral (📢)</option>
            </select>
            <RichTextEditor
              content={newNotice.content}
              onChange={(html) =>
                setNewNotice({ ...newNotice, content: html })
              }
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingNotice}
                className="bg-[var(--color-accent)] text-[var(--color-accent-text)] font-bold"
              >
                {isSavingNotice ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Novo Modal (Adicionar Atualização) */}
      {isCommentModalOpen && (
        <Modal
          onClose={() => setIsCommentModalOpen(false)}
          title="Adicionar Atualização"
          size="md"
        >
          <p className="text-[13px] text-[var(--color-text-muted)] mb-5">
            Adicione um novo comentário técnico a esta ocorrência.
          </p>
          <form
            onSubmit={(e) => {
              if (activeNotice) handleAddComment(e, activeNotice.id);
            }}
            className="flex flex-col gap-4"
          >
            <textarea
              autoFocus
              placeholder="Detalhes da atualização..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full h-[100px] p-3 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] rounded-[4px] text-[13px] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCommentModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingComment || !commentText.trim()}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] font-bold"
              >
                {isSubmittingComment ? "Enviando..." : "Enviar Atualização"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}