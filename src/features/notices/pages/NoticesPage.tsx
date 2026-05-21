import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Megaphone,
  ArrowRightLeft,
  MessageSquare,
  Send,
  Plus,
  X,
  Loader2,
  User,
} from "lucide-react";
import type { NoticeBoardResponse } from "../types";
import { noticesService } from "../api/noticesService";
import { Button } from "../../../components/ui/Button";
import { InputField } from "../../../components/ui/InputField";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";

export default function NoticesPage() {
  const [boardData, setBoardData] = useState<NoticeBoardResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"Geral" | "Turno">("Turno");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);

  // Estados para Comentários Dinâmicos
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {},
  );
  const [isSubmittingComment, setIsSubmittingComment] = useState<
    Record<number, boolean>
  >({});

  // Estados do Modal de Criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: "",
    type: "Turno" as "Geral" | "Turno",
    content: "",
  });

  const fetchBoard = async () => {
    try {
      const data = await noticesService.getMyBoard();

      // 👇 Blindagem: Garante que mesmo se a API responder algo estranho, a estrutura básica exista
      if (data && data.data) {
        setBoardData(data);
      } else {
        setBoardData({
          needsSync: false,
          currentYear: new Date().getFullYear(),
          data: [],
        });
      }
    } catch (error) {
      console.error("Erro ao carregar mural do NOC", error);
      // 👇 Se der erro na API, joga um array vazio seguro para a tela não apagar
      setBoardData({
        needsSync: false,
        currentYear: new Date().getFullYear(),
        data: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleSyncHolidays = async () => {
    if (!boardData) return;
    setIsSyncingHolidays(true);
    try {
      await noticesService.syncHolidays(boardData.currentYear);
      alert(
        `Feriados de ${boardData.currentYear} validados e sincronizados com sucesso!`,
      );
      await fetchBoard();
    } catch (error) {
      alert("Falha ao sincronizar feriados.");
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await noticesService.acknowledgeNotice(id);
      // Otimização de UI: Remove da tela imediatamente sem precisar recarregar tudo
      setBoardData((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.filter((n) => n.id !== id),
            }
          : null,
      );
    } catch (error) {
      alert("Erro ao processar ação.");
    }
  };

  const handleSendComment = async (e: React.FormEvent, noticeId: number) => {
    e.preventDefault();
    const text = commentInputs[noticeId]?.trim();
    if (!text) return;

    setIsSubmittingComment((prev) => ({ ...prev, [noticeId]: true }));
    try {
      await noticesService.addComment(noticeId, text);
      setCommentInputs((prev) => ({ ...prev, [noticeId]: "" }));
      await fetchBoard(); // Atualiza a thread com o comentário oficial do backend
    } catch (error) {
      alert("Não foi possível enviar o comentário.");
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [noticeId]: false }));
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) {
      alert("Preencha todos os campos do aviso.");
      return;
    }

    setIsSavingNotice(true);
    try {
      await noticesService.createNotice(newNotice);
      setIsModalOpen(false);
      setNewNotice({ title: "", type: "Turno", content: "" });
      await fetchBoard();
    } catch (error) {
      alert("Erro ao postar no mural.");
    } finally {
      setIsSavingNotice(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtra as ocorrências de acordo com a aba ativa
  const filteredNotices =
    boardData && boardData.data
      ? boardData.data.filter((n) => n.type === activeTab)
      : [];
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f7fb] h-full w-full">
        <Loader2 className="w-10 h-10 text-[#0058be] animate-spin mb-2" />
        <span className="text-[14px] font-semibold text-[#74777d]">
          Sincronizando mural de operações...
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9fa] h-full w-full">
      {/* 1. BANNER FIXO DE ALERTA DE SINCRONIZAÇÃO */}
      {boardData?.needsSync && (
        <div className="bg-[#ba1a1a] text-white px-8 py-3 flex items-center justify-between text-[14px] font-bold shadow-md shrink-0 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="animate-pulse" />
            <span>
              Atenção! O sistema detectou que os feriados de{" "}
              {boardData.currentYear} ainda não foram validados no banco de
              dados.
            </span>
          </div>
          <button
            disabled={isSyncingHolidays}
            onClick={handleSyncHolidays}
            className="bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/40 px-4 py-1 rounded-[4px] text-[12px] font-extrabold uppercase transition-colors"
          >
            {isSyncingHolidays ? "Sincronizando..." : "Sincronizar Agora"}
          </button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col">
        {/* Cabeçalho do Painel */}
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#041627] tracking-tight">
              Comunicação e Passagens
            </h1>
            <p className="text-[14px] text-[#74777d] mt-1">
              Mural ativo de ocorrências, passagem de plantão e alertas
              operacionais.
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold shadow-sm"
          >
            <Plus size={18} className="mr-2" /> Nova Mensagem
          </Button>
        </div>

        {/* Seleção de Abas Operacionais */}
        <div className="flex border-b border-[#e4e2e3] mb-6 shrink-0 gap-6">
          <button
            onClick={() => setActiveTab("Turno")}
            className={`flex items-center gap-2 pb-3 text-[15px] font-bold border-b-2 transition-all ${activeTab === "Turno" ? "border-[#0058be] text-[#0058be]" : "border-transparent text-[#74777d] hover:text-[#1b1c1d]"}`}
          >
            <ArrowRightLeft size={18} /> Passagem de Turno (
            {boardData?.data.filter((n) => n.type === "Turno").length})
          </button>
          <button
            onClick={() => setActiveTab("Geral")}
            className={`flex items-center gap-2 pb-3 text-[15px] font-bold border-b-2 transition-all ${activeTab === "Geral" ? "border-[#0058be] text-[#0058be]" : "border-transparent text-[#74777d] hover:text-[#1b1c1d]"}`}
          >
            <Megaphone size={18} /> Avisos Gerais (
            {boardData?.data.filter((n) => n.type === "Geral").length})
          </button>
        </div>

        {/* 2. GRID DE CARDS */}
        {filteredNotices.length === 0 ? (
          <div className="flex-1 border border-dashed border-[#e4e2e3] bg-white rounded-[12px] flex flex-col items-center justify-center p-10 text-center">
            <p className="text-[15px] font-bold text-[#041627]">
              Tudo limpo no quadrante!
            </p>
            <p className="text-[13px] text-[#74777d] mt-1">
              Nenhuma pendência ou aviso ativo registrado para este filtro.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {filteredNotices.map((notice) => (
              <div
                key={notice.id}
                className={`bg-white rounded-[12px] border shadow-sm p-6 flex flex-col transition-all duration-300 hover:shadow-md
                  ${notice.type === "Turno" ? "border-violet-100 hover:border-violet-200" : "border-[#e4e2e3] hover:border-blue-200"}`}
              >
                {/* Meta Dados do Cabeçalho do Card */}
                <div className="flex justify-between items-start mb-3 gap-4">
                  <h3 className="text-[16px] font-extrabold text-[#041627] leading-snug">
                    {notice.title}
                  </h3>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-[4px] shrink-0 tracking-wider shadow-sm
                    ${notice.type === "Turno" ? "bg-violet-600 text-white" : "bg-[#0058be] text-white"}`}
                  >
                    {notice.type === "Turno" ? "Turno" : "Aviso"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[12px] text-[#74777d] font-semibold mb-4">
                  <User size={13} className="text-zinc-400" />
                  <span>{notice.createdByUserName}</span>
                  <span className="text-[#e4e2e3]">•</span>
                  <span>{formatDate(notice.createdAt)}</span>
                </div>

                {/* CONTEÚDO DO EDITAL (HTML Injetado de forma Segura) */}
                <div
                  className="text-[14px] text-[#44474c] leading-relaxed mb-6 prose prose-sm max-w-none border-b border-[#efedef] pb-4"
                  dangerouslySetInnerHTML={{ __html: notice.content }}
                />

                {/* 3. SEÇÃO DE COMENTÁRIOS (Apenas em Turnos) */}
                {notice.type === "Turno" && (
                  <div className="flex flex-col gap-4 mb-6 bg-[#f8fafc] p-4 rounded-[8px] border border-[#efedef]">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-violet-700 uppercase tracking-wide">
                      <MessageSquare size={14} />
                      <span>
                        Atualizações e Notas ({notice.comments.length})
                      </span>
                    </div>

                    {/* Lista Interna de Comentários */}
                    <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                      {notice.comments.length === 0 ? (
                        <p className="text-[11px] font-medium text-zinc-400 italic">
                          Nenhum comentário na linha do tempo.
                        </p>
                      ) : (
                        notice.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-white border border-[#efedef] rounded-[6px] p-2.5 shadow-xs text-[12px]"
                          >
                            <div className="flex justify-between font-bold text-[#1b1c1d] text-[11px] mb-1">
                              <span className="text-violet-600">
                                @{comment.createdByUserName}
                              </span>
                              <span className="text-zinc-400">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-[#44474c] font-medium leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Formulário de Envio de Comentários */}
                    <form
                      onSubmit={(e) => handleSendComment(e, notice.id)}
                      className="flex gap-2 items-center mt-1"
                    >
                      <input
                        type="text"
                        placeholder="Adicionar nota técnica..."
                        value={commentInputs[notice.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [notice.id]: e.target.value,
                          }))
                        }
                        className="flex-1 h-[34px] px-3 bg-white border border-[#c4c6cd] rounded-[4px] text-[13px] focus:outline-none focus:border-violet-500 font-medium"
                      />
                      <button
                        type="submit"
                        disabled={
                          isSubmittingComment[notice.id] ||
                          !commentInputs[notice.id]?.trim()
                        }
                        className="h-[34px] w-[34px] rounded-[4px] bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 active:bg-violet-800 transition-colors disabled:bg-zinc-200 disabled:text-zinc-400 shrink-0 shadow-sm"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </div>
                )}

                {/* Botões de Ação Dinâmicos */}
                <div className="mt-auto flex justify-end">
                  <Button
                    onClick={() => handleAcknowledge(notice.id)}
                    className={`w-full font-bold text-[13px] h-10 shadow-xs uppercase tracking-wide
                      ${
                        notice.type === "Turno"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-white border border-[#e4e2e3] text-[#44474c] hover:bg-zinc-50"
                      }`}
                  >
                    {notice.type === "Turno"
                      ? "✓ Resolver Pendência"
                      : "Marcar como Ciente"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. MODAL DE CRIAÇÃO DE NOVOS AVISOS / OCORRÊNCIAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-[550px] bg-white rounded-[12px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X size={20} />
            </button>

            <h2 className="text-[20px] font-bold text-[#041627] mb-1">
              Registrar Ocorrência / Aviso
            </h2>
            <p className="text-[13px] text-[#74777d] mb-6">
              Esta mensagem será publicada imediatamente no quadro operacional
              ativo do NOC.
            </p>

            <form onSubmit={handleCreateNotice} className="flex flex-col gap-5">
              <InputField
                label="Título da Ocorrência"
                id="title"
                required
                value={newNotice.title}
                onChange={(e) =>
                  setNewNotice({ ...newNotice, title: e.target.value })
                }
              />

              <div className="flex flex-col gap-1 w-full">
                <label className="text-[12px] font-semibold text-[#44474c] uppercase tracking-wider">
                  Destino do Alerta
                </label>
                <select
                  className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                  value={newNotice.type}
                  onChange={(e) =>
                    setNewNotice({
                      ...newNotice,
                      type: e.target.value as "Geral" | "Turno",
                    })
                  }
                >
                  <option value="Turno">
                    Passagem de Turno (Urgência Técnica)
                  </option>
                  <option value="Geral">Aviso Geral (📢)</option>
                </select>
              </div>

              {/* Rich Text Editor Isolado */}
              <div className="flex flex-col gap-1 w-full">
                <label className="text-[12px] font-semibold text-[#44474c] uppercase tracking-wider mb-1">
                  Conteúdo e Instruções Técnicas
                </label>
                <RichTextEditor
                  content={newNotice.content}
                  onChange={(html) =>
                    setNewNotice({ ...newNotice, content: html })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#efedef]">
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
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold"
                >
                  {isSavingNotice ? "Publicando..." : "Publicar no Mural"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
