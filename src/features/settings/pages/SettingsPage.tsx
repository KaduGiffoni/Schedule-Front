import React, { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Pencil,
  Settings as SettingsIcon,
  Calendar,
  AlertTriangle,
  Repeat,
} from "lucide-react";
import { holidayService, type Holiday } from "../api/holidayService";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";
import { Header } from "../../../components/layout/Header";
import { Sidebar } from "../../../components/layout/Sidebar";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("feriados");

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [needsSync, setNeedsSync] = useState(false); // 👇 Novo estado
  const [isLoading, setIsLoading] = useState(true);

  const [syncYear, setSyncYear] = useState(new Date().getFullYear());
  const [isSyncing, setIsSyncing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 👇 formData agora inclui o isRecurring
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
      // 👇 Atualiza a lista e o estado de sincronização com o novo formato do backend
      setHolidays(response.data);
      setNeedsSync(response.needsSync);
      if (response.currentYear) setSyncYear(response.currentYear);
    } catch (error) {
      console.error("Erro ao carregar feriados", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await holidayService.syncHolidays(syncYear);
      await fetchHolidays();
      alert(`Feriados de ${syncYear} sincronizados com sucesso!`);
    } catch (error: any) {
      console.error("Erro completo da sincronização:", error);

      // Captura a mensagem exata do C# ou do Axios
      const backendMessage =
        error.response?.data?.Message ||
        error.response?.data?.title ||
        error.message ||
        "Erro interno no servidor.";

      alert(`Falha ao sincronizar: ${backendMessage}`);
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
      } else {
        await holidayService.createHoliday(formData);
      }
      await fetchHolidays();
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar feriado.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateBR = (isoString: string) => {
    const [year, month, day] = isoString.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex h-screen w-full bg-[#fbf9fa] font-sans overflow-hidden text-[#1b1c1d]">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-[28px] font-extrabold text-[#041627] tracking-tight">
              Configurações do Sistema
            </h1>
            <p className="text-[14px] text-[#74777d] mt-1">
              Gerencie parâmetros globais, feriados e regras de negócio do NOC.
            </p>
          </div>

          <div className="flex gap-8 items-start">
            <aside className="w-[240px] shrink-0 bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm p-2 flex flex-col gap-1">
              <button
                onClick={() => setActiveTab("geral")}
                className={`flex items-center gap-3 px-4 py-3 text-[14px] font-semibold rounded-[6px] transition-colors ${activeTab === "geral" ? "bg-[#f5f7fb] text-[#0058be]" : "text-[#44474c] hover:bg-[#fbf9fa]"}`}
              >
                <SettingsIcon size={18} /> Geral
              </button>
              <button
                onClick={() => setActiveTab("feriados")}
                className={`flex items-center gap-3 px-4 py-3 text-[14px] font-semibold rounded-[6px] transition-colors ${activeTab === "feriados" ? "bg-[#f5f7fb] text-[#0058be]" : "text-[#44474c] hover:bg-[#fbf9fa]"}`}
              >
                <Calendar size={18} /> Feriados da Escala
              </button>
            </aside>

            <div className="flex-1">
              {activeTab === "feriados" && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                  {/* 👇 Novo Alerta de Sincronização baseado no C# */}
                  {needsSync && !isLoading && (
                    <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[8px] p-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-3 text-[#b45309]">
                        <AlertTriangle size={24} className="shrink-0" />
                        <div>
                          <h4 className="text-[14px] font-bold">
                            Atualização Pendente
                          </h4>
                          <p className="text-[12px] font-medium mt-0.5 opacity-90">
                            A base de feriados não está íntegra para o ano
                            atual. Recomendamos realizar a sincronização
                            nacional.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-[#d97706] hover:bg-[#b45309] text-white shrink-0"
                      >
                        {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
                      </Button>
                    </div>
                  )}

                  <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-[16px] font-bold text-[#041627]">
                        Integração Nacional
                      </h3>
                      <p className="text-[13px] text-[#74777d] mt-1">
                        Busque feriados automaticamente da API Nacional por ano.
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-[#f5f7fb] p-1.5 rounded-[6px] border border-[#e4e2e3]">
                        <input
                          type="number"
                          className="w-20 bg-transparent text-center text-[14px] font-bold outline-none"
                          value={syncYear}
                          onChange={(e) => setSyncYear(Number(e.target.value))}
                        />
                        <Button
                          onClick={handleSync}
                          disabled={isSyncing}
                          variant="outline"
                          className="h-8 px-3 text-[12px] bg-white"
                        >
                          <RefreshCw
                            size={14}
                            className={`mr-2 ${isSyncing ? "animate-spin" : ""}`}
                          />
                          API
                        </Button>
                      </div>
                      <div className="w-px h-8 bg-[#e4e2e3]"></div>
                      <Button
                        onClick={openNewModal}
                        className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white"
                      >
                        <Plus size={18} className="mr-2" /> Novo Manual
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-[#e4e2e3]">
                          <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                            Nome do Feriado
                          </th>
                          <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#efedef]">
                        {isLoading ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-10 text-[#74777d]"
                            >
                              Carregando feriados...
                            </td>
                          </tr>
                        ) : holidays.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-10 text-[#74777d]"
                            >
                              Nenhum feriado cadastrado.
                            </td>
                          </tr>
                        ) : (
                          holidays.map((h) => (
                            <tr
                              key={h.id}
                              className="hover:bg-[#fbf9fa] transition-colors group"
                            >
                              <td className="px-6 py-4 text-[14px] font-bold text-[#1b1c1d]">
                                {formatDateBR(h.date)}
                                {h.isRecurring && (
                                  <span
                                    title="Repete anualmente"
                                    className="ml-2 text-[#0058be] inline-flex align-middle"
                                  >
                                    <Repeat size={14} />
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-[14px] font-medium text-[#44474c]">
                                {h.name}
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-[4px] uppercase tracking-wide border border-blue-100">
                                  {h.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => openEditModal(h)}
                                  className="text-[#0058be] hover:bg-blue-50 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Pencil size={16} />
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
                <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm p-8 text-center text-[#74777d] animate-in fade-in duration-300">
                  Configurações gerais em desenvolvimento...
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-[400px] bg-white rounded-[12px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-[20px] font-bold text-[#041627] mb-1">
              {editingId ? "Editar Feriado" : "Adicionar Feriado"}
            </h2>
            <p className="text-[13px] text-[#74777d] mb-6">
              Defina as datas que afetam a escala de trabalho.
            </p>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <InputField
                label="Nome do Feriado"
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <InputField
                label="Data"
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />

              <div className="flex flex-col gap-1 w-full">
                <label className="text-[12px] font-semibold text-[#44474c] uppercase tracking-wider">
                  Tipo
                </label>
                <select
                  className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="Nacional">Nacional</option>
                  <option value="Estadual">Estadual</option>
                  <option value="Municipal">Municipal</option>
                  <option value="Facultativo">Ponto Facultativo</option>
                </select>
              </div>

              {/* 👇 Novo Checkbox de Recorrência */}
              <div className="flex items-center gap-2 mt-2 mb-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData({ ...formData, isRecurring: e.target.checked })
                  }
                  className="w-4 h-4 text-[#1d4ed8] bg-[#fbf9fa] border-[#c4c6cd] rounded focus:ring-[#0058be] cursor-pointer"
                />
                <label
                  htmlFor="isRecurring"
                  className="text-[13px] font-semibold text-[#44474c] cursor-pointer select-none"
                >
                  Feriado Recorrente (Repete todos os anos)
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-[#efedef]">
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
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white"
                >
                  {isSaving ? "A guardar..." : "Salvar Feriado"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
