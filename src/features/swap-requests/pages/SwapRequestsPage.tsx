import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeftRight,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  History,
  Inbox,
} from "lucide-react";
import axios from "axios";
import {
  SwapStatus,
  SWAP_STATUS_LABELS,
  type SwapRequest,
  type PagedResult,
} from "../types";
import { swapRequestsService } from "../api/swapRequestsService";
import { scheduleService } from "../../dashboard/api/scheduleService";
import { usersService, type User } from "../../users/api/usersService";
import { useAuthStore } from "../../../features/auth/store/authStore";
import { useHasRole } from "../../../lib/useHasRole";
import { Button } from "../../../components/ui/Button";
import type { ScheduleDay } from "../../dashboard/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

/** Badge colorido para o status do pedido */
const StatusBadge = ({ status }: { status: number }) => {
  const configs: Record<number, { color: string; icon: React.ReactNode }> = {
    [SwapStatus.Pending]:  { color: "bg-amber-100 text-amber-700",   icon: <Clock size={11} /> },
    [SwapStatus.Approved]: { color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 size={11} /> },
    [SwapStatus.Rejected]: { color: "bg-red-100 text-red-600",        icon: <XCircle size={11} /> },
  };
  const c = configs[status] ?? configs[SwapStatus.Pending];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${c.color}`}>
      {c.icon}
      {SWAP_STATUS_LABELS[status] ?? "Desconhecido"}
    </span>
  );
};

// ── Tipos de aba ───────────────────────────────────────────────────────────────
type Tab = "pending" | "history" | "create";

// ── Componente principal ───────────────────────────────────────────────────────
export default function SwapRequestsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  // ── Dados do usuário logado ──────────────────────────────────────────────────
  const userProfile = useAuthStore((s) => s.userProfile);
  const myUserId = userProfile?.userId ?? "";
  const myLetterId = userProfile?.letterId ?? null;
  // Verifica se pode listar usuários (Admin/Manager) — Standard recebe 403
  const canListUsers = useHasRole('Admin', 'Manager');

  // ── Pedidos pendentes ────────────────────────────────────────────────────────
  const [pending, setPending] = useState<SwapRequest[]>([]);
  const [isPendingLoading, setIsPendingLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setIsPendingLoading(true);
    try {
      const data = await swapRequestsService.getPending();
      setPending(Array.isArray(data) ? data : []);
    } catch {
      setPending([]);
    } finally {
      setIsPendingLoading(false);
    }
  }, []);

  // ── Histórico paginado ───────────────────────────────────────────────────────
  const [history, setHistory] = useState<PagedResult<SwapRequest> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async (page: number) => {
    setIsHistoryLoading(true);
    try {
      const data = await swapRequestsService.getHistory(page, 10);
      setHistory(data);
    } catch {
      setHistory(null);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // ── Modal de criação ─────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  const [formData, setFormData] = useState({
    targetUserId: "",
    scheduleDayId: "" as string | number,
  });

  // ── Carregar dados conforme aba ativa ────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "pending") fetchPending();
    if (activeTab === "history") fetchHistory(historyPage);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "history") fetchHistory(historyPage);
  }, [historyPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar dados do modal ao abrir ─────────────────────────────────────────
  const openModal = useCallback(async () => {
    setCreateError(null);
    setCreateSuccess(null);
    setFormData({ targetUserId: "", scheduleDayId: "" });
    setIsModalOpen(true);
    setIsLoadingModal(true);

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Se o usuário não tiver permissão para listar (Standard/Viewer),
      // usersData será [] e o campo de colega mostrará aviso amigável
      const [usersData, daysThisMonth, daysNextMonth] = await Promise.all([
        canListUsers
          ? usersService.getAllUsers().catch(() => [])
          : Promise.resolve([]),
        scheduleService.getEscalaGeral(year, month).catch(() => []),
        scheduleService.getEscalaGeral(
          month === 12 ? year + 1 : year,
          month === 12 ? 1 : month + 1,
        ).catch(() => []),
      ]);

      // Remove o próprio usuário logado da lista de colegas
      setUsers((usersData as User[]).filter((u) => u.userId !== myUserId));

      // Filtra dias futuros: data > hoje
      const today = now.toISOString().split("T")[0];
      const allDays = [...daysThisMonth, ...daysNextMonth] as ScheduleDay[];
      const futureDays = allDays
        .filter((d) => {
          const dateStr = d.date?.split("T")[0] ?? "";
          if (dateStr <= today) return false;
          // Se o usuário tem letterId, mostrar apenas seus próprios dias
          if (myLetterId !== null) return d.letterId === myLetterId;
          return true;
        })
        // Deduplica por id
        .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

      setScheduleDays(futureDays);
    } finally {
      setIsLoadingModal(false);
    }
  }, [myUserId, myLetterId]);

  // ── Aceitar / Recusar ────────────────────────────────────────────────────────
  const handleRespond = async (id: number, accept: boolean) => {
    setRespondError(null);
    setRespondingId(id);
    try {
      await swapRequestsService.respond(id, accept);
      // Remove da lista de pendentes localmente (optimistic)
      setPending((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.mensagem ?? err.response?.data?.erro ?? "Erro ao responder.")
        : "Erro inesperado.";
      setRespondError(msg);
    } finally {
      setRespondingId(null);
    }
  };

  // ── Criar pedido ─────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!formData.targetUserId) {
      setCreateError("Selecione o colega para a troca.");
      return;
    }
    if (!formData.scheduleDayId) {
      setCreateError("Selecione o dia da sua escala.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await swapRequestsService.createRequest({
        targetUserId: formData.targetUserId,
        scheduleDayId: Number(formData.scheduleDayId),
      });
      setCreateSuccess(res.mensagem ?? "Pedido de troca enviado com sucesso!");
      setFormData({ targetUserId: "", scheduleDayId: "" });
      // Atualiza pendentes em background
      fetchPending();
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.erro ?? err.response?.data?.mensagem ?? "Erro ao solicitar troca.")
        : "Erro inesperado.";
      setCreateError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render das abas ──────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: "pending",
      label: "Para Mim",
      icon: <Inbox size={15} />,
      count: pending.length,
    },
    {
      id: "history",
      label: "Histórico",
      icon: <History size={15} />,
    },
  ];

  const selectClass =
    "w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[6px] focus:outline-none focus:border-[#0058be] transition-colors";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9fa] h-full w-full">
      <div className="flex-1 overflow-y-auto p-8 flex flex-col">

        {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-8 shrink-0">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#041627] tracking-tight flex items-center gap-3">
              <ArrowLeftRight size={26} className="text-[#0058be]" />
              Trocas de Turno
            </h1>
            <p className="text-[14px] text-[#74777d] mt-1">
              Gerencie pedidos de troca, aceite solicitações de colegas e consulte o histórico.
            </p>
          </div>
          <Button
            onClick={openModal}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold shadow-sm shrink-0"
          >
            <Plus size={18} className="mr-2" /> Nova Solicitação
          </Button>
        </div>

        {/* ── Abas ────────────────────────────────────────────────────────────── */}
        <div
          className="flex border-b mb-6 shrink-0 gap-1"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 pb-3 px-1 text-[14px] font-bold border-b-2 transition-all mr-5"
                style={{
                  borderColor: isActive ? "var(--color-accent)" : "transparent",
                  color: isActive ? "var(--color-accent-text)" : "var(--color-text-faint)",
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className="ml-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "var(--color-error)",
                      color: "white",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 1 — PENDENTES PARA MIM
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "pending" && (
          <div className="flex flex-col gap-4">
            {respondError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-[8px] px-4 py-3 text-[13px] font-semibold text-red-700 mb-2">
                <AlertCircle size={15} />
                <span>{respondError}</span>
                <button onClick={() => setRespondError(null)} className="ml-auto">
                  <X size={14} />
                </button>
              </div>
            )}

            {isPendingLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-20">
                <Loader2 className="w-8 h-8 text-[#0058be] animate-spin" />
                <span className="text-[13px] text-[#74777d] font-medium">Buscando pedidos...</span>
              </div>
            ) : pending.length === 0 ? (
              <div className="border border-dashed border-[#e4e2e3] bg-white rounded-[12px] flex flex-col items-center justify-center p-12 text-center">
                <Inbox size={36} className="text-[#c4c6cd] mb-3" />
                <p className="text-[15px] font-bold text-[#041627]">Nenhum pedido pendente</p>
                <p className="text-[13px] text-[#74777d] mt-1">
                  Quando um colega solicitar troca com você, o pedido aparecerá aqui.
                </p>
              </div>
            ) : (
              pending.map((req) => {
                const requester =
                  req.requestingUser?.completeName ||
                  req.requestingUser?.userName ||
                  "Colega";
                const dayDate = req.scheduleDay?.date
                  ? formatDate(req.scheduleDay.date)
                  : "data desconhecida";
                const shiftName =
                  req.scheduleDay?.shift?.name ?? "turno";
                const isResponding = respondingId === req.id;

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-[12px] border border-[#e4e2e3] shadow-sm p-6 flex items-start gap-5 hover:shadow-md transition-shadow"
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0"
                      style={{
                        backgroundColor: "var(--color-accent-dim)",
                        color: "var(--color-accent-text)",
                      }}
                    >
                      {requester.charAt(0).toUpperCase()}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#041627]">
                        <span className="text-[#0058be]">{requester}</span>
                        {" "}quer trocar com você
                      </p>
                      <p className="text-[13px] text-[#44474c] mt-0.5">
                        Turno de{" "}
                        <span className="font-semibold text-[#1b1c1d]">
                          {shiftName}
                        </span>
                        {" "}em{" "}
                        <span className="font-semibold text-[#1b1c1d]">{dayDate}</span>
                      </p>
                      <p className="text-[11px] text-[#74777d] mt-1">
                        {timeAgo(req.createdAt)} · Pedido #{req.id}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(req.id, false)}
                        disabled={isResponding}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[12px] font-bold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors disabled:opacity-40"
                      >
                        {isResponding ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <XCircle size={13} />
                        )}
                        Recusar
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, true)}
                        disabled={isResponding}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[12px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 transition-colors disabled:opacity-40"
                      >
                        {isResponding ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Aceitar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 2 — HISTÓRICO
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div className="flex flex-col gap-4">
            {isHistoryLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-20">
                <Loader2 className="w-8 h-8 text-[#0058be] animate-spin" />
                <span className="text-[13px] text-[#74777d] font-medium">Carregando histórico...</span>
              </div>
            ) : !history || history.items.length === 0 ? (
              <div className="border border-dashed border-[#e4e2e3] bg-white rounded-[12px] flex flex-col items-center justify-center p-12 text-center">
                <History size={36} className="text-[#c4c6cd] mb-3" />
                <p className="text-[15px] font-bold text-[#041627]">Nenhuma troca registrada</p>
                <p className="text-[13px] text-[#74777d] mt-1">
                  O histórico de trocas solicitadas e recebidas aparecerá aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-[10px] border border-[#e4e2e3] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-[#e4e2e3]">
                          {["#", "Solicitante", "Destino", "Dia / Turno", "Criado em", "Status"].map((h) => (
                            <th
                              key={h}
                              className="px-5 py-3.5 text-[11px] font-bold text-[#74777d] uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#efedef]">
                        {history.items.map((req) => {
                          const requester =
                            req.requestingUser?.completeName ||
                            req.requestingUser?.userName ||
                            req.requestingUserId.slice(0, 8) + "…";
                          const target =
                            req.targetUser?.completeName ||
                            req.targetUser?.userName ||
                            req.targetUserId.slice(0, 8) + "…";
                          const dayDate = req.scheduleDay?.date
                            ? formatDateShort(req.scheduleDay.date)
                            : "—";
                          const shiftName = req.scheduleDay?.shift?.name ?? "—";
                          const isMe = req.requestingUserId === myUserId;

                          return (
                            <tr key={req.id} className="hover:bg-[#fbf9fa] transition-colors">
                              <td className="px-5 py-4 text-[12px] text-[#74777d] font-mono">
                                #{req.id}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                    style={{
                                      backgroundColor: isMe ? "var(--color-accent-dim)" : "var(--color-surface-dim)",
                                      color: isMe ? "var(--color-accent-text)" : "var(--color-text-muted)",
                                    }}
                                  >
                                    {requester.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-[13px] font-medium text-[#1b1c1d]">
                                    {requester}
                                    {isMe && (
                                      <span className="ml-1 text-[10px] font-bold text-[#0058be]">(eu)</span>
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[13px] text-[#44474c] font-medium">
                                {target}
                                {req.targetUserId === myUserId && (
                                  <span className="ml-1 text-[10px] font-bold text-violet-600">(eu)</span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-[13px] font-semibold text-[#1b1c1d]">{dayDate}</p>
                                <p className="text-[11px] text-[#74777d]">{shiftName}</p>
                              </td>
                              <td className="px-5 py-4 text-[12px] text-[#74777d] whitespace-nowrap">
                                {formatDateShort(req.createdAt)}
                              </td>
                              <td className="px-5 py-4">
                                <StatusBadge status={req.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Rodapé com paginação */}
                  <div className="px-5 py-3 border-t border-[#e4e2e3] bg-[#f8fafc] flex items-center justify-between">
                    <span className="text-[12px] text-[#74777d]">
                      Página{" "}
                      <span className="font-bold text-[#1b1c1d]">{history.currentPage}</span>
                      {" "}de{" "}
                      <span className="font-bold text-[#1b1c1d]">{history.totalPages}</span>
                      {" "}·{" "}
                      <span className="font-bold text-[#1b1c1d]">{history.totalCount}</span> registros
                    </span>
                    <div className="flex gap-1">
                      <button
                        disabled={history.currentPage <= 1}
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[5px] text-[12px] font-semibold border border-[#e4e2e3] text-[#44474c] hover:bg-[#f0f4f8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={13} /> Anterior
                      </button>
                      <button
                        disabled={history.currentPage >= history.totalPages}
                        onClick={() => setHistoryPage((p) => Math.min(history.totalPages, p + 1))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[5px] text-[12px] font-semibold border border-[#e4e2e3] text-[#44474c] hover:bg-[#f0f4f8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Próximo <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de Criação ──────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-[480px] bg-white rounded-[14px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                <ArrowLeftRight size={18} className="text-[#1d4ed8]" />
              </div>
              <h2 className="text-[19px] font-bold text-[#041627]">Solicitar Troca de Turno</h2>
            </div>
            <p className="text-[13px] text-[#74777d] mb-6 ml-12">
              Escolha um colega e um dia da sua escala para solicitar a troca.
            </p>

            {createError && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2.5 text-[12px] font-medium text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="mb-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-[8px] px-3 py-2.5 text-[12px] font-medium text-emerald-700">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span>{createSuccess}</span>
              </div>
            )}

            {isLoadingModal ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-[#0058be] animate-spin" />
                <span className="text-[12px] text-[#74777d]">Carregando sua escala...</span>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col gap-5">
                {/* Colega */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                    Colega para a troca
                  </label>
                  {users.length === 0 ? (
                    <p className="text-[12px] text-[#74777d] italic">
                      Sem permissão para listar usuários ou nenhum disponível.
                    </p>
                  ) : (
                    <select
                      className={selectClass}
                      value={formData.targetUserId}
                      onChange={(e) =>
                        setFormData({ ...formData, targetUserId: e.target.value })
                      }
                    >
                      <option value="">Selecione um colega...</option>
                      {users.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.completeName || u.user}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Dia da escala */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                    Dia da sua escala
                  </label>
                  {scheduleDays.length === 0 ? (
                    <p className="text-[12px] text-[#74777d] italic">
                      Nenhum dia de escala futuro encontrado.
                    </p>
                  ) : (
                    <select
                      className={selectClass}
                      value={formData.scheduleDayId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduleDayId: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione o dia...</option>
                      {scheduleDays.map((d) => {
                        const dateStr = d.date?.split("T")[0] ?? "";
                        const label = formatDate(dateStr);
                        return (
                          <option key={d.id} value={d.id}>
                            {label} — {d.shiftName}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Rodapé */}
                <div className="flex justify-end gap-3 pt-2 border-t border-[#efedef] mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving || users.length === 0 || scheduleDays.length === 0}
                    className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold"
                  >
                    {isSaving ? "Enviando..." : "Enviar Pedido"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
