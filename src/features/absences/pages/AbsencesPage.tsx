import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarOff,
  Plus,
  X,
  Loader2,
  Trash2,
  Palmtree,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { absencesService } from "../api/absencesService";
import { AbsenceType, ABSENCE_TYPE_LABELS, type AbsenceResponseDTO } from "../types";
import { usersService, type User } from "../../users/api/usersService";
import { useHasRole } from "../../../lib/useHasRole";
import { Button } from "../../../components/ui/Button";
import { InputField } from "../../../components/ui/InputField";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<number, { bg: string; text: string }> = {
  [AbsenceType.Ferias]:         { bg: "bg-emerald-100", text: "text-emerald-700" },
  [AbsenceType.CompensacaoHora]:{ bg: "bg-blue-100",    text: "text-blue-700" },
  [AbsenceType.Atestado]:       { bg: "bg-amber-100",   text: "text-amber-700" },
  [AbsenceType.Falta]:          { bg: "bg-red-100",     text: "text-red-700" },
  [AbsenceType.Outro]:          { bg: "bg-zinc-100",    text: "text-zinc-600" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<AbsenceResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Modal de criação ─────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    startDate: todayIso(),
    endDate: todayIso(),
    type: AbsenceType.Ferias as number,
    targetUserId: "" as string,
    substituteUserId: "" as string,
    notes: "" as string,
  });

  // ── Dados auxiliares ─────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [canFetchUsers, setCanFetchUsers] = useState(true);

  // Controle de acesso baseado em roles do JWT
  const isAdminOrManager = useHasRole('Admin', 'Manager');

  // ── Fetch de ausências ───────────────────────────────────────────────────────
  const fetchAbsences = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await absencesService.getAll();
      setAbsences(data);
    } catch {
      console.error("Erro ao carregar ausências");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  // ── Fetch de usuários (para substituto / targetUserId) ────────────────────────
  useEffect(() => {
    if (!canFetchUsers) return;
    usersService
      .getAllUsers()
      .then(setUsers)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          // Standard user — esconde o campo de substituto graciosamente
          setCanFetchUsers(false);
        }
      });
  }, [canFetchUsers]);

  // ── Sincronizar endDate = startDate ao mudar tipo para CompensacaoHora ───────
  useEffect(() => {
    if (formData.type === AbsenceType.CompensacaoHora) {
      setFormData((prev) => ({ ...prev, endDate: prev.startDate }));
    }
  }, [formData.type, formData.startDate]);

  // ── Criar ausência ───────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.startDate || !formData.endDate) {
      setFormError("Preencha as datas de início e fim.");
      return;
    }
    if (formData.endDate < formData.startDate) {
      setFormError("A data de fim não pode ser anterior à data de início.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Parameters<typeof absencesService.create>[0] = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        type: formData.type,
      };
      if (formData.notes.trim()) payload.notes = formData.notes.trim();
      if (formData.substituteUserId) payload.substituteUserId = formData.substituteUserId;
      if (isAdminOrManager && formData.targetUserId)
        payload.targetUserId = formData.targetUserId;

      await absencesService.create(payload);
      setIsModalOpen(false);
      setFormData({
        startDate: todayIso(), endDate: todayIso(),
        type: AbsenceType.Ferias, targetUserId: "",
        substituteUserId: "", notes: "",
      });
      await fetchAbsences();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.erro ||
          err.response?.data?.message ||
          "Erro ao registrar ausência. Verifique os dados.";
        setFormError(msg);
      } else {
        setFormError("Erro inesperado. Tente novamente.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Excluir ausência ─────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    setDeleteError(null);
    setDeletingId(id);
    try {
      await absencesService.remove(id);
      setAbsences((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          setDeleteError("Você só pode remover suas próprias ausências.");
        } else if (err.response?.status === 404) {
          setDeleteError("Ausência não encontrada.");
        } else {
          setDeleteError("Erro ao remover ausência.");
        }
      } else {
        setDeleteError("Erro inesperado.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9fa] h-full w-full">
      <div className="flex-1 overflow-y-auto p-8 flex flex-col">

        {/* Cabeçalho */}
        <div className="flex justify-between items-start mb-8 shrink-0">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#041627] tracking-tight flex items-center gap-3">
              <CalendarOff size={26} className="text-[#0058be]" />
              Ausências e Afastamentos
            </h1>
            <p className="text-[14px] text-[#74777d] mt-1">
              Férias, compensações de hora, atestados e outras ausências da equipe.
            </p>
          </div>
          <Button
            onClick={() => { setFormError(null); setIsModalOpen(true); }}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold shadow-sm shrink-0"
          >
            <Plus size={18} className="mr-2" /> Registrar Ausência
          </Button>
        </div>

        {/* Banner de erro de exclusão */}
        {deleteError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-[8px] px-4 py-3 text-[13px] font-semibold text-red-700 shrink-0">
            <AlertCircle size={16} />
            <span>{deleteError}</span>
            <button
              onClick={() => setDeleteError(null)}
              className="ml-auto text-red-400 hover:text-red-700"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Tabela */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-[#0058be] animate-spin" />
            <span className="text-[13px] text-[#74777d] font-medium">Carregando ausências...</span>
          </div>
        ) : absences.length === 0 ? (
          <div className="flex-1 border border-dashed border-[#e4e2e3] bg-white rounded-[12px] flex flex-col items-center justify-center p-10 text-center">
            <Palmtree size={36} className="text-[#c4c6cd] mb-3" />
            <p className="text-[15px] font-bold text-[#041627]">Nenhuma ausência registrada</p>
            <p className="text-[13px] text-[#74777d] mt-1">
              Todas as equipes estão disponíveis neste período.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] border border-[#e4e2e3] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e4e2e3]">
                    {["Colaborador", "Tipo", "Início", "Fim", "Dias", "Substituto", "Obs.", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3.5 text-[11px] font-bold text-[#74777d] uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efedef]">
                  {absences.map((a) => {
                    const colors = TYPE_COLORS[a.type] ?? TYPE_COLORS[AbsenceType.Outro];
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-[#fbf9fa] transition-colors group"
                      >
                        {/* Colaborador */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                              style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent-text)" }}
                            >
                              {a.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[13px] font-semibold text-[#1b1c1d]">
                              {a.userName}
                            </span>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-[5px] text-[11px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}
                          >
                            {a.typeDescription}
                          </span>
                        </td>

                        {/* Datas */}
                        <td className="px-5 py-4 text-[13px] text-[#44474c] font-medium whitespace-nowrap">
                          {formatDate(a.startDate)}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[#44474c] font-medium whitespace-nowrap">
                          {formatDate(a.endDate)}
                        </td>

                        {/* Total de dias */}
                        <td className="px-5 py-4">
                          <span className="text-[13px] font-bold text-[#1d4ed8]">
                            {a.totalDays}d
                          </span>
                        </td>

                        {/* Substituto */}
                        <td className="px-5 py-4 text-[13px] text-[#44474c]">
                          {a.substituteUserName ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck size={14} className="text-emerald-600" />
                              <span className="font-medium">{a.substituteUserName}</span>
                            </div>
                          ) : (
                            <span className="text-[#c4c6cd]">—</span>
                          )}
                        </td>

                        {/* Notas */}
                        <td className="px-5 py-4 max-w-[160px]">
                          {a.notes ? (
                            <span
                              className="text-[12px] text-[#74777d] truncate block"
                              title={a.notes}
                            >
                              {a.notes}
                            </span>
                          ) : (
                            <span className="text-[#c4c6cd]">—</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-5 py-4 text-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                            <button
                              onClick={() => handleDelete(a.id)}
                              disabled={deletingId === a.id}
                              className="p-1.5 rounded-[5px] text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                              title="Remover ausência"
                            >
                              {deletingId === a.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#e4e2e3] bg-[#f8fafc] flex justify-between items-center">
              <span className="text-[12px] text-[#74777d]">
                <span className="font-bold text-[#1b1c1d]">{absences.length}</span> ausência{absences.length !== 1 ? "s" : ""} registrada{absences.length !== 1 ? "s" : ""}
              </span>
            </div>
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
          <div className="relative w-full max-w-[520px] bg-white rounded-[14px] shadow-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                <Palmtree size={18} className="text-[#1d4ed8]" />
              </div>
              <h2 className="text-[19px] font-bold text-[#041627]">
                Registrar Ausência
              </h2>
            </div>
            <p className="text-[13px] text-[#74777d] mb-6 ml-12">
              Registre férias, atestados e outros afastamentos da equipe.
            </p>

            {formError && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2.5 text-[12px] font-medium text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-4">

              {/* Tipo de ausência */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                  Tipo de Ausência
                </label>
                <select
                  className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[6px] focus:outline-none focus:border-[#0058be] transition-colors"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: parseInt(e.target.value) })
                  }
                >
                  {Object.entries(ABSENCE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Datas */}
              <div className={`grid gap-4 ${formData.type === AbsenceType.CompensacaoHora ? "grid-cols-1" : "grid-cols-2"}`}>
                <InputField
                  label="Data de Início"
                  id="startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
                {/* Para Compensação de Hora, end = start (mas editável) */}
                {formData.type !== AbsenceType.CompensacaoHora ? (
                  <InputField
                    label="Data de Fim"
                    id="endDate"
                    type="date"
                    required
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                ) : (
                  <InputField
                    label="Data de Fim (mesmo dia)"
                    id="endDate"
                    type="date"
                    required
                    value={formData.endDate}
                    hint="Para compensações, normalmente é o mesmo dia."
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Substituto — só se a API de usuários retornou com sucesso */}
              {canFetchUsers && users.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                    Substituto <span className="font-normal text-[#74777d] lowercase">(opcional)</span>
                  </label>
                  <select
                    className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[6px] focus:outline-none focus:border-[#0058be] transition-colors"
                    value={formData.substituteUserId}
                    onChange={(e) =>
                      setFormData({ ...formData, substituteUserId: e.target.value })
                    }
                  >
                    <option value="">Sem substituto</option>
                    {users.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.completeName || u.user}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Para quem é esta ausência (só Admin/Manager) */}
              {isAdminOrManager && users.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#0058be] uppercase tracking-wider">
                    Para qual colaborador <span className="font-normal text-[#74777d]">(Admin/Manager)</span>
                  </label>
                  <select
                    className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#eff6ff] border border-[#93c5fd] rounded-[6px] focus:outline-none focus:border-[#0058be] transition-colors"
                    value={formData.targetUserId}
                    onChange={(e) =>
                      setFormData({ ...formData, targetUserId: e.target.value })
                    }
                  >
                    <option value="">Minha própria ausência</option>
                    {users.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.completeName || u.user}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Observações */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
                  Observações <span className="font-normal text-[#74777d] lowercase">(opcional)</span>
                </label>
                <textarea
                  className="w-full px-3 py-2.5 text-[13px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[6px] focus:outline-none focus:border-[#0058be] resize-none transition-colors"
                  rows={3}
                  placeholder="Ex: CID informado no atestado, motivo da compensação..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              {/* Botões */}
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
                  disabled={isSaving}
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold"
                >
                  {isSaving ? "Registrando..." : "Confirmar Ausência"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
