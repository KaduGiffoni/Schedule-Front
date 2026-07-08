import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarOff,
  Plus,
  Loader2,
  Trash2,
  Pencil,
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
import { Modal } from "../../../components/ui/Modal";
import { useToastStore } from "../../../lib/toastStore";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<number, { bg: string; text: string }> = {
  [AbsenceType.Ferias]:         { bg: "bg-[var(--color-success-subtle)]", text: "text-[var(--color-success)]" },
  [AbsenceType.CompensacaoHora]:{ bg: "bg-[var(--color-accent-subtle)]",  text: "text-[var(--color-accent)]" },
  [AbsenceType.Atestado]:       { bg: "bg-[var(--color-warning-subtle)]", text: "text-[var(--color-warning)]" },
  [AbsenceType.Falta]:          { bg: "bg-[var(--color-error-subtle)]",   text: "text-[var(--color-error)]" },
  [AbsenceType.Outro]:          { bg: "bg-[var(--color-surface-dim)]",    text: "text-[var(--color-text-muted)]" },
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
  const showToast = useToastStore((state) => state.showToast);
  const [absences, setAbsences] = useState<AbsenceResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Modal de criação/edição ───────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
      showToast("Erro ao carregar ausências", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

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

  // ── Abrir modal para editar ──────────────────────────────────────────────────
  const handleOpenEdit = (a: AbsenceResponseDTO) => {
    setFormError(null);
    setEditingId(a.id);
    setFormData({
      startDate: a.startDate.split("T")[0],
      endDate: a.endDate.split("T")[0],
      type: a.type,
      targetUserId: a.userId,
      substituteUserId: a.substituteUserId ?? "",
      notes: a.notes ?? "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      startDate: todayIso(), endDate: todayIso(),
      type: AbsenceType.Ferias, targetUserId: "",
      substituteUserId: "", notes: "",
    });
  };

  // ── Criar ou editar ausência ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
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

      if (editingId) {
        await absencesService.update(editingId, payload);
        showToast("Ausência atualizada com sucesso", "success");
      } else {
        await absencesService.create(payload);
        showToast("Ausência registrada com sucesso", "success");
      }
      handleCloseModal();
      await fetchAbsences();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.erro ||
          err.response?.data?.message ||
          "Erro ao salvar ausência. Verifique os dados.";
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
    setDeletingId(id);
    try {
      await absencesService.remove(id);
      setAbsences((prev) => prev.filter((a) => a.id !== id));
      showToast("Ausência removida com sucesso", "success");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          showToast("Você só pode remover suas próprias ausências.", "error");
        } else if (err.response?.status === 404) {
          showToast("Ausência não encontrada.", "error");
        } else {
          showToast("Erro ao remover ausência.", "error");
        }
      } else {
        showToast("Erro inesperado.", "error");
      }
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)] h-full w-full font-sans">
      <div className="flex-1 overflow-y-auto p-8 flex flex-col">

        {/* Cabeçalho */}
        <div className="flex justify-between items-start mb-8 shrink-0">
          <div>
            <h1 className="text-[28px] font-extrabold text-[var(--color-text)] tracking-tight flex items-center gap-3">
              <CalendarOff size={26} className="text-[var(--color-accent)]" />
              Ausências e Afastamentos
            </h1>
            <p className="text-[14px] text-[var(--color-text-faint)] mt-1">
              Férias, compensações de hora, atestados e outras ausências da equipe.
            </p>
          </div>
          <Button
            onClick={() => { setFormError(null); setEditingId(null); setIsModalOpen(true); }}
            className="bg-[var(--color-accent-hover)] hover:bg-[var(--color-accent-text)] text-white font-semibold shadow-sm shrink-0"
          >
            <Plus size={18} className="mr-2" /> Registrar Ausência
          </Button>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
            <span className="text-[13px] text-[var(--color-text-faint)] font-medium">Carregando ausências...</span>
          </div>
        ) : absences.length === 0 ? (
          <div className="flex-1 border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] flex flex-col items-center justify-center p-10 text-center">
            <div className="w-16 h-16 bg-[var(--color-surface-dim)] text-[var(--color-text-faint)] rounded-full flex items-center justify-center mb-4">
              <Palmtree size={32} />
            </div>
            <p className="text-[18px] font-bold text-[var(--color-text)]">Nenhuma ausência registrada</p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
              Todas as equipes estão disponíveis neste período.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] rounded-[10px] border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-dim)] border-b border-[var(--color-border)]">
                    {["Colaborador", "Tipo", "Início", "Fim", "Dias", "Substituto", "Obs.", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3.5 text-[11px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {absences.map((a) => {
                    const colors = TYPE_COLORS[a.type] ?? TYPE_COLORS[AbsenceType.Outro];
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-[var(--color-surface-raised)] transition-colors group"
                      >
                        {/* Colaborador */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]"
                            >
                              {a.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[13px] font-semibold text-[var(--color-text)]">
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
                        <td className="px-5 py-4 text-[13px] text-[var(--color-text-muted)] font-medium whitespace-nowrap">
                          {formatDate(a.startDate)}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[var(--color-text-muted)] font-medium whitespace-nowrap">
                          {formatDate(a.endDate)}
                        </td>

                        {/* Total de dias */}
                        <td className="px-5 py-4">
                          <span className="text-[13px] font-bold text-[var(--color-accent-hover)]">
                            {a.totalDays}d
                          </span>
                        </td>

                        {/* Substituto */}
                        <td className="px-5 py-4 text-[13px] text-[var(--color-text-muted)]">
                          {a.substituteUserName ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck size={14} className="text-[var(--color-success)]" />
                              <span className="font-medium">{a.substituteUserName}</span>
                            </div>
                          ) : (
                            <span className="text-[var(--color-text-faint)]">—</span>
                          )}
                        </td>

                        {/* Notas */}
                        <td className="px-5 py-4 max-w-[160px]">
                          {a.notes ? (
                            <span
                              className="text-[12px] text-[var(--color-text-faint)] truncate block"
                              title={a.notes}
                            >
                              {a.notes}
                            </span>
                          ) : (
                            <span className="text-[var(--color-border)]">—</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-5 py-4 text-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(a)}
                              className="p-1.5 rounded-[5px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors"
                              title="Editar ausência"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              disabled={deletingId === a.id}
                              className="p-1.5 rounded-[5px] text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors disabled:opacity-40"
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
            <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-dim)] flex justify-between items-center">
              <span className="text-[12px] text-[var(--color-text-faint)]">
                <span className="font-bold text-[var(--color-text)]">{absences.length}</span> ausência{absences.length !== 1 ? "s" : ""} registrada{absences.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de Criação/Edição ────────────────────────────────────────────── */}
      {isModalOpen && (
        <Modal
          onClose={handleCloseModal}
          title={editingId ? "Editar Ausência" : "Registrar Ausência"}
          icon={<Palmtree size={18} className="text-[var(--color-accent-hover)]" />}
          size="md"
        >
        <p className="text-[13px] text-[var(--color-text-faint)] mb-6">
          {editingId
            ? "Atualize os dados desta ausência."
            : "Registre férias, atestados e outros afastamentos da equipe."}
        </p>

        {formError && (
          <div className="mb-4 flex items-start gap-2 bg-[var(--color-error-subtle)] border border-[var(--color-error)] rounded-[8px] px-3 py-2.5 text-[12px] font-medium text-[var(--color-error)]">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Tipo de ausência */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Tipo de Ausência
            </label>
            <select
              className="w-full h-[40px] px-3 text-[14px] text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
              <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Substituto <span className="font-normal text-[var(--color-text-faint)] lowercase">(opcional)</span>
              </label>
              <select
                className="w-full h-[40px] px-3 text-[14px] text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
              <label className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                Para qual colaborador <span className="font-normal text-[var(--color-text-faint)]">(Admin/Manager)</span>
              </label>
              <select
                className="w-full h-[40px] px-3 text-[14px] text-[var(--color-text)] bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] rounded-[6px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
            <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Observações <span className="font-normal text-[var(--color-text-faint)] lowercase">(opcional)</span>
            </label>
            <textarea
              className="w-full px-3 py-2.5 text-[13px] text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] focus:outline-none focus:border-[var(--color-accent)] resize-none transition-colors"
              rows={3}
              placeholder="Ex: CID informado no atestado, motivo da compensação..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)] mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[var(--color-accent-hover)] hover:bg-[var(--color-accent-text)] text-white font-bold"
            >
              {isSaving
                ? (editingId ? "Salvando..." : "Registrando...")
                : (editingId ? "Salvar Alterações" : "Confirmar Ausência")}
            </Button>
          </div>
        </form>
        </Modal>
      )}
    </div>
  );
}