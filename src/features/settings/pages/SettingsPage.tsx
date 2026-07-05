import React, { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Pencil,
  Settings as SettingsIcon,
  Calendar,
  AlertTriangle,
  Repeat,
  Loader2,
} from "lucide-react";
import { holidayService, type Holiday } from "../api/holidayService";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { showToast } from "../../../lib/toastStore";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("feriados");

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [needsSync, setNeedsSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [syncYear, setSyncYear] = useState(new Date().getFullYear());
  const [isSyncing, setIsSyncing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    type: "Nacional",
    isRecurring: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const response = await holidayService.getAll();
      setHolidays(response.data);
      setNeedsSync(response.needsSync);
      if (response.currentYear) setSyncYear(response.currentYear);
    } catch {
      showToast("Erro ao carregar feriados.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await holidayService.syncHolidays(syncYear);
      await fetchHolidays();
      showToast(`Feriados de ${syncYear} sincronizados com sucesso!`, "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { Message?: string; title?: string } }; message?: string };
      const msg =
        err.response?.data?.Message ||
        err.response?.data?.title ||
        err.message ||
        "Erro interno no servidor.";
      showToast(`Falha ao sincronizar: ${msg}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: "", date: "", type: "Nacional", isRecurring: false });
    setIsModalOpen(true);
  };

  const openEditModal = (holiday: Holiday) => {
    setEditingId(holiday.id);
    setFormData({
      name: holiday.name,
      date: holiday.date.split("T")[0],
      type: holiday.type || "Nacional",
      isRecurring: holiday.isRecurring || false,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await holidayService.updateHoliday(editingId, formData);
        showToast("Feriado atualizado com sucesso!", "success");
      } else {
        await holidayService.createHoliday(formData);
        showToast("Feriado adicionado com sucesso!", "success");
      }
      await fetchHolidays();
      setIsModalOpen(false);
    } catch {
      showToast("Erro ao salvar feriado. Verifique os dados e tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateBR = (isoString: string) => {
    const [year, month, day] = isoString.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  const tabStyle = (id: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    width: "100%",
    transition: "background-color 150ms ease-out, color 150ms ease-out",
    backgroundColor: activeTab === id ? "var(--color-accent-dim)" : "transparent",
    color: activeTab === id ? "var(--color-accent-text)" : "var(--color-text-muted)",
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
            Configurações do Sistema
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-faint)", marginTop: "4px" }}>
            Gerencie parâmetros globais, feriados e regras de negócio do NOC.
          </p>
        </div>

        <div style={{ display: "flex", gap: "28px", alignItems: "flex-start" }}>
          {/* Sidebar de tabs */}
          <aside
            style={{
              width: "220px",
              flexShrink: 0,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "10px",
              boxShadow: "var(--shadow-sm)",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <button style={tabStyle("geral")} onClick={() => setActiveTab("geral")}>
              <SettingsIcon size={17} /> Geral
            </button>
            <button style={tabStyle("feriados")} onClick={() => setActiveTab("feriados")}>
              <Calendar size={17} /> Feriados da Escala
            </button>
          </aside>

          {/* Conteúdo */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeTab === "feriados" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Alerta de sincronização */}
                {needsSync && !isLoading && (
                  <div
                    style={{
                      backgroundColor: "var(--color-warning-subtle)",
                      border: "1px solid var(--color-warning)",
                      borderRadius: "10px",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <AlertTriangle size={22} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>
                          Atualização Pendente
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          A base de feriados não está íntegra para o ano atual. Recomendamos sincronizar.
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleSync} disabled={isSyncing} style={{ backgroundColor: "var(--color-warning)", color: "white", flexShrink: 0 }}>
                      {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
                    </Button>
                  </div>
                )}

                {/* Card de integração */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    boxShadow: "var(--shadow-sm)",
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)" }}>
                      Integração Nacional
                    </h3>
                    <p style={{ fontSize: "13px", color: "var(--color-text-faint)", marginTop: "4px" }}>
                      Busque feriados automaticamente da API Nacional por ano.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: "var(--color-surface-dim)",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <input
                        type="number"
                        style={{
                          width: "72px",
                          background: "transparent",
                          textAlign: "center",
                          fontSize: "14px",
                          fontWeight: 700,
                          outline: "none",
                          border: "none",
                          color: "var(--color-text)",
                        }}
                        value={syncYear}
                        onChange={(e) => setSyncYear(Number(e.target.value))}
                      />
                      <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="sm">
                        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                        &nbsp;API
                      </Button>
                    </div>
                    <div style={{ width: "1px", height: "32px", backgroundColor: "var(--color-border)" }} />
                    <Button onClick={openNewModal} style={{ backgroundColor: "var(--color-accent)", color: "white" }}>
                      <Plus size={16} />&nbsp;Novo Manual
                    </Button>
                  </div>
                </div>

                {/* Tabela de feriados */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    boxShadow: "var(--shadow-sm)",
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--color-surface-dim)", borderBottom: "1px solid var(--color-border)" }}>
                        {["Data", "Nome do Feriado", "Tipo", ""].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "12px 20px",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--color-text-faint)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              textAlign: h === "" ? "right" : "left",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-faint)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                              <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-accent)" }} />
                              Carregando feriados...
                            </div>
                          </td>
                        </tr>
                      ) : holidays.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-faint)", fontSize: "14px" }}>
                            Nenhum feriado cadastrado. Sincronize a API ou adicione manualmente.
                          </td>
                        </tr>
                      ) : (
                        holidays.map((h) => (
                          <tr
                            key={h.id}
                            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                          >
                            <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>
                              {formatDateBR(h.date)}
                              {h.isRecurring && (
                                <span title="Repete anualmente" style={{ marginLeft: "6px", color: "var(--color-accent)", display: "inline-flex", verticalAlign: "middle" }}>
                                  <Repeat size={13} />
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "14px 20px", fontSize: "14px", color: "var(--color-text-muted)" }}>
                              {h.name}
                            </td>
                            <td style={{ padding: "14px 20px" }}>
                              <span style={{
                                backgroundColor: "var(--color-accent-dim)",
                                color: "var(--color-accent-text)",
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}>
                                {h.type}
                              </span>
                            </td>
                            <td style={{ padding: "14px 20px", textAlign: "right" }}>
                              <button
                                onClick={() => openEditModal(h)}
                                aria-label={`Editar feriado ${h.name}`}
                                style={{
                                  color: "var(--color-accent)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "6px",
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  transition: "background-color 120ms ease-out",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-accent-dim)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                              >
                                <Pencil size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "geral" && (
              <div
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  boxShadow: "var(--shadow-sm)",
                  padding: "40px",
                  textAlign: "center",
                  color: "var(--color-text-faint)",
                  fontSize: "14px",
                }}
              >
                Configurações gerais em desenvolvimento...
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal criar/editar feriado — usa componente Modal.tsx */}
      {isModalOpen && (
        <Modal
          title={editingId ? "Editar Feriado" : "Adicionar Feriado"}
          icon={<Calendar size={18} />}
          onClose={() => setIsModalOpen(false)}
          size="sm"
        >
          <p style={{ fontSize: "13px", color: "var(--color-text-faint)", marginBottom: "20px", marginTop: "-4px" }}>
            Defina as datas que afetam a escala de trabalho.
          </p>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InputField
              label="Nome do Feriado"
              id="holiday-name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <InputField
              label="Data"
              id="holiday-date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tipo
              </label>
              <select
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-surface-dim)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  outline: "none",
                }}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="Nacional">Nacional</option>
                <option value="Estadual">Estadual</option>
                <option value="Municipal">Municipal</option>
                <option value="Facultativo">Ponto Facultativo</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="holiday-recurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                style={{ width: "16px", height: "16px", accentColor: "var(--color-accent)", cursor: "pointer" }}
              />
              <label htmlFor="holiday-recurring" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)", cursor: "pointer" }}>
                Feriado Recorrente (repete todos os anos)
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid var(--color-border-subtle)", marginTop: "4px" }}>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} style={{ backgroundColor: "var(--color-accent)", color: "white" }}>
                {isSaving ? "Salvando..." : "Salvar Feriado"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
