import React, { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  Megaphone,
  ArrowRightLeft,
  MessageSquare,
  Send,
  Plus,
  Loader2,
  User,
} from "lucide-react";
import type { Notice } from "../types";
import { noticesService } from "../api/noticesService";
import { holidayService } from "../../settings/api/holidayService";
import { Button } from "../../../components/ui/Button";
import { InputField } from "../../../components/ui/InputField";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { Modal } from "../../../components/ui/Modal";
import { useSearchParams } from "react-router-dom";
import { useHasRole } from "../../../lib/useHasRole";
import { showToast } from "../../../lib/toastStore";

export default function NoticesPage() {
  // ── State principal: array simples de avisos ────────────────────────────────
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeTab, setActiveTab] = useState<"Geral" | "Turno">("Turno");
  const [isLoading, setIsLoading] = useState(true);

  // Query param para destacar um notice específico (vindo do dropdown de notificações)
  const [searchParams] = useSearchParams();
  const [highlightedNoticeId, setHighlightedNoticeId] = useState<number | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  // Controle de acesso: só Admin/Manager podem criar avisos
  const canCreateNotice = useHasRole('Admin', 'Manager');

  // ── State do banner de feriados (buscado separadamente via /api/Holidays) ──
  const [holidayNeedsSync, setHolidayNeedsSync] = useState(false);
  const [holidayCurrentYear, setHolidayCurrentYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);

  // ── Estados para Comentários Dinâmicos ──────────────────────────────────────
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {},
  );
  const [isSubmittingComment, setIsSubmittingComment] = useState<
    Record<number, boolean>
  >({});

  // ── Estados do Modal de Criação ─────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: "",
    type: "Turno" as "Geral" | "Turno",
    content: "",
  });

  // ── Fetch dos avisos (retorno é Notice[] direto) ────────────────────────────
  const fetchBoard = async () => {
    try {
      const data = await noticesService.getMyBoard();
      setNotices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar mural do NOC", error);
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch do status de feriados via /api/Holidays ──────────────────────────
  // Este endpoint SIM retorna { needsSync, currentYear, data }
  const fetchHolidayStatus = async () => {
    try {
      const res = await holidayService.getAll();
      setHolidayNeedsSync(res.needsSync);
      setHolidayCurrentYear(res.currentYear);
    } catch {
      // Se falhar, simplesmente não exibe o banner — não quebra a página
      setHolidayNeedsSync(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchHolidayStatus();
  }, []);

  // ── Destacar card via ?noticeId=X ──────────────────────────────────────────
  useEffect(() => {
    const noticeIdParam = searchParams.get("noticeId");
    if (!noticeIdParam || isLoading) return;
    const id = parseInt(noticeIdParam, 10);
    if (isNaN(id)) return;

    // Encontrar o aviso e mudar para a aba correta
    const target = notices.find((n) => n.id === id);
    if (target) {
      setActiveTab(target.type);
      setHighlightedNoticeId(id);
      // Scroll para o card após render
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      // Remove o highlight após 3s
      setTimeout(() => setHighlightedNoticeId(null), 3000);
    }
  }, [searchParams, notices, isLoading]);

  const handleSyncHolidays = async () => {
    setIsSyncingHolidays(true);
    try {
      await holidayService.syncHolidays(holidayCurrentYear);
      showToast(`Feriados de ${holidayCurrentYear} sincronizados com sucesso!`, "success");
      await fetchHolidayStatus();
    } catch {
      showToast("Falha ao sincronizar feriados.", "error");
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await noticesService.acknowledgeNotice(id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch {
      showToast("Erro ao processar ação.", "error");
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
      await fetchBoard();
    } catch {
      showToast("Não foi possível enviar o comentário.", "error");
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [noticeId]: false }));
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) {
      showToast("Preencha o título e o conteúdo do aviso.", "warning");
      return;
    }

    setIsSavingNotice(true);
    try {
      await noticesService.createNotice(newNotice);
      setIsModalOpen(false);
      setNewNotice({ title: "", type: "Turno", content: "" });
      await fetchBoard();
      showToast("Aviso publicado no mural!", "success");
    } catch {
      showToast("Erro ao postar no mural.", "error");
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
  const filteredNotices = notices.filter((n) => n.type === activeTab);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg)", height: "100%", width: "100%" }}>
        <Loader2 style={{ width: "40px", height: "40px", color: "var(--color-accent)", animation: "spin 1s linear infinite", marginBottom: "8px" }} />
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-faint)" }}>Sincronizando mural de operações...</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--color-bg)", height: "100%", width: "100%", color: "var(--color-text)" }}>
      {/* 1. BANNER FIXO DE ALERTA DE SINCRONIZAÇÃO DE FERIADOS */}
      {/* Exibido quando /api/Holidays reporta needsSync=true */}
      {holidayNeedsSync && (
        <div style={{ backgroundColor: "var(--color-error)", color: "white", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", fontWeight: 700, boxShadow: "var(--shadow-md)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={18} className="animate-pulse" />
            <span>Atenção! Os feriados de {holidayCurrentYear} ainda não foram validados no banco de dados.</span>
          </div>
          <button
            disabled={isSyncingHolidays}
            onClick={handleSyncHolidays}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)", color: "white", padding: "4px 14px", borderRadius: "4px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", cursor: "pointer" }}
          >
            {isSyncingHolidays ? "Sincronizando..." : "Sincronizar Agora"}
          </button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column" }}>
        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>Comunicação e Passagens</h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-faint)", marginTop: "4px" }}>Mural ativo de ocorrências, passagem de plantão e alertas operacionais.</p>
          </div>
          {canCreateNotice && (
            <Button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: "var(--color-accent)", color: "white", width: "auto", padding: "0 20px" }}>
              <Plus size={16} /> &nbsp;Nova Mensagem
            </Button>
          )}
        </div>

        {/* Abas */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: "24px", flexShrink: 0, gap: "24px" }}>
          {(["Turno", "Geral"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                paddingBottom: "12px", fontSize: "15px", fontWeight: 700,
                borderBottom: `2px solid ${activeTab === tab ? "var(--color-accent)" : "transparent"}`,
                color: activeTab === tab ? "var(--color-accent-text)" : "var(--color-text-faint)",
                background: "none", border: "none", borderBottomWidth: "2px",
                borderBottomStyle: "solid",
                borderBottomColor: activeTab === tab ? "var(--color-accent)" : "transparent",
                cursor: "pointer",
                transition: "color 150ms ease-out, border-color 150ms ease-out",
              }}
            >
              {tab === "Turno" ? <ArrowRightLeft size={17} /> : <Megaphone size={17} />}
              {tab === "Turno" ? "Passagem de Turno" : "Avisos Gerais"} ({notices.filter((n) => n.type === tab).length})
            </button>
          ))}
        </div>

        {/* 2. GRID DE CARDS */}
        {filteredNotices.length === 0 ? (
          <div style={{ flex: 1, border: "2px dashed var(--color-border)", backgroundColor: "var(--color-surface)", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)" }}>Tudo limpo no quadrante!</p>
            <p style={{ fontSize: "13px", color: "var(--color-text-faint)", marginTop: "4px" }}>Nenhuma pendência ou aviso ativo registrado para este filtro.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "20px", alignItems: "start" }}>
            {filteredNotices.map((notice) => (
              <div
                key={notice.id}
                ref={notice.id === highlightedNoticeId ? highlightRef : null}
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderRadius: "12px",
                  border: `1px solid ${notice.id === highlightedNoticeId ? "var(--color-accent)" : notice.type === "Turno" ? "var(--color-shift-night-bg)" : "var(--color-border)"}`,
                  boxShadow: notice.id === highlightedNoticeId ? "0 0 0 2px var(--color-accent)" : "var(--shadow-sm)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow 300ms ease-out, border-color 300ms ease-out",
                }}
              >
                {/* Meta Dados do Cabeçalho do Card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.3 }}>{notice.title}</h3>
                  <span style={{
                    fontSize: "10px", fontWeight: 900, textTransform: "uppercase", padding: "2px 8px", borderRadius: "4px", flexShrink: 0, letterSpacing: "0.06em",
                    backgroundColor: notice.type === "Turno" ? "var(--color-shift-night)" : "var(--color-accent)",
                    color: "white",
                  }}>{notice.type === "Turno" ? "Turno" : "Aviso"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--color-text-faint)", fontWeight: 600, marginBottom: "16px" }}>
                  <User size={12} />
                  <span>{notice.createdByUserName}</span>
                  <span style={{ color: "var(--color-border)" }}>•</span>
                  <span>{formatDate(notice.createdAt)}</span>
                </div>

                {/* CONTEÚDO DO EDITAL (HTML Injetado de forma Segura) */}
                <div
                  style={{ fontSize: "14px", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--color-border-subtle)" }}
                  dangerouslySetInnerHTML={{ __html: notice.content }}
                  className="prose prose-sm max-w-none"
                />

                {/* 3. SEÇÃO DE COMENTÁRIOS (Apenas em Turnos) */}
                {notice.type === "Turno" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px", backgroundColor: "var(--color-surface-dim)", padding: "14px", borderRadius: "8px", border: "1px solid var(--color-border-subtle)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--color-shift-night)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      <MessageSquare size={13} />
                      <span>Atualizações e Notas ({notice.comments.length})</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto" }}>
                      {notice.comments.length === 0 ? (
                        <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-faint)", fontStyle: "italic" }}>Nenhum comentário na linha do tempo.</p>
                      ) : (
                        notice.comments.map((comment) => (
                          <div key={comment.id} style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: "6px", padding: "10px 12px", fontSize: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "11px", marginBottom: "4px" }}>
                              <span style={{ color: "var(--color-shift-night)" }}>@{comment.createdByUserName}</span>
                              <span style={{ color: "var(--color-text-faint)" }}>{formatDate(comment.createdAt)}</span>
                            </div>
                            <p style={{ color: "var(--color-text-muted)", lineHeight: 1.5 }}>{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={(e) => handleSendComment(e, notice.id)} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="text"
                        placeholder="Adicionar nota técnica..."
                        value={commentInputs[notice.id] || ""}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [notice.id]: e.target.value }))}
                        style={{ flex: 1, height: "34px", padding: "0 12px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "6px", fontSize: "13px", color: "var(--color-text)", outline: "none" }}
                      />
                      <button
                        type="submit"
                        aria-label="Enviar comentário"
                        disabled={isSubmittingComment[notice.id] || !commentInputs[notice.id]?.trim()}
                        style={{ height: "34px", width: "34px", borderRadius: "6px", backgroundColor: "var(--color-shift-night)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0 }}
                      >
                        <Send size={13} />
                      </button>
                    </form>
                  </div>
                )}

                {/* Botões de Ação Dinâmicos */}
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    onClick={() => handleAcknowledge(notice.id)}
                    style={{
                      width: "100%", fontWeight: 700, fontSize: "13px", height: "40px", textTransform: "uppercase", letterSpacing: "0.04em",
                      backgroundColor: notice.type === "Turno" ? "var(--color-success)" : "var(--color-surface-dim)",
                      color: notice.type === "Turno" ? "white" : "var(--color-text-muted)",
                      border: notice.type === "Turno" ? "none" : "1px solid var(--color-border)",
                    }}
                  >
                    {notice.type === "Turno" ? "✓ Resolver Pendência" : "Marcar como Ciente"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO — usa Modal.tsx */}
      {isModalOpen && (
        <Modal title="Registrar Ocorrência / Aviso" icon={<Megaphone size={18} />} onClose={() => setIsModalOpen(false)} size="md">
          <p style={{ fontSize: "13px", color: "var(--color-text-faint)", marginBottom: "20px", marginTop: "-4px" }}>
            Esta mensagem será publicada imediatamente no quadro operacional ativo do NOC.
          </p>
          <form onSubmit={handleCreateNotice} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InputField label="Título da Ocorrência" id="notice-title" required value={newNotice.title}
              onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })} />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Destino do Alerta</label>
              <select
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--color-text)", backgroundColor: "var(--color-surface-dim)", border: "1px solid var(--color-border)", borderRadius: "6px", outline: "none" }}
                value={newNotice.type}
                onChange={(e) => setNewNotice({ ...newNotice, type: e.target.value as "Geral" | "Turno" })}
              >
                <option value="Turno">Passagem de Turno (Urgência Técnica)</option>
                <option value="Geral">Aviso Geral (📢)</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Conteúdo e Instruções Técnicas</label>
              <RichTextEditor content={newNotice.content} onChange={(html) => setNewNotice({ ...newNotice, content: html })} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid var(--color-border-subtle)", marginTop: "4px" }}>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSavingNotice} style={{ backgroundColor: "var(--color-accent)", color: "white" }}>
                {isSavingNotice ? "Publicando..." : "Publicar no Mural"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
