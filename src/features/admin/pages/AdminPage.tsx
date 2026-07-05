import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, Building2, Layers, Tags, Clock, GitBranch,
  CalendarCog, Trash2, UserCog, X, Plus, Loader2, AlertCircle,
  CheckCircle2, RefreshCw, ChevronRight, Lock,
} from "lucide-react";
import axios from "axios";
import { useHasRole } from "../../../lib/useHasRole";
import { adminService } from "../api/adminService";
import { usersService, type User } from "../../users/api/usersService";
import { Button } from "../../../components/ui/Button";
import { InputField } from "../../../components/ui/InputField";
import type {
  Company, CreateCompanyDTO,
  Sector, CreateSectorDTO,
  CreateLetterDTO,
  Shift, CreateShiftDTO,
  ShiftPattern, CreateShiftPatternDTO,
  GenerateRotationDTO,
} from "../types";
import type { Letter } from "../../letters/api/lettersService";

// ── Helpers ────────────────────────────────────────────────────────────────────

function apiError(err: unknown, fallback = "Erro inesperado."): string {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.erro ||
      err.response?.data?.message ||
      err.response?.data?.mensagem ||
      fallback
    );
  }
  return fallback;
}

// ── Sub-abas ──────────────────────────────────────────────────────────────────

type TabId =
  | "companies"
  | "sectors"
  | "letters"
  | "shifts"
  | "patterns"
  | "generate"
  | "reset"
  | "promote";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}

const TABS: TabConfig[] = [
  { id: "companies", label: "Empresas",         icon: <Building2 size={16} /> },
  { id: "sectors",   label: "Setores",           icon: <Layers size={16} /> },
  { id: "letters",   label: "Equipes",           icon: <Tags size={16} /> },
  { id: "shifts",    label: "Turnos",            icon: <Clock size={16} /> },
  { id: "patterns",  label: "Padrões de Turno",  icon: <GitBranch size={16} /> },
  { id: "generate",  label: "Gerar Escala",       icon: <CalendarCog size={16} /> },
  { id: "reset",     label: "Zerar Escala",       icon: <Trash2 size={16} />, danger: true },
  { id: "promote",   label: "Promover Usuário",   icon: <UserCog size={16} /> },
];

// ── Componente de Feedback ─────────────────────────────────────────────────────
const Feedback = ({
  type, message, onClose,
}: {
  type: "error" | "success";
  message: string;
  onClose?: () => void;
}) => (
  <div
    className={`flex items-start gap-2 px-4 py-3 rounded-[8px] text-[13px] font-medium mb-4 ${
      type === "error"
        ? "bg-red-50 border border-red-200 text-red-700"
        : "bg-emerald-50 border border-emerald-200 text-emerald-700"
    }`}
  >
    {type === "error"
      ? <AlertCircle size={15} className="mt-0.5 shrink-0" />
      : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
    <span className="flex-1">{message}</span>
    {onClose && (
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={13} />
      </button>
    )}
  </div>
);

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
const Modal = ({
  title, icon, onClose, children,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative w-full max-w-[480px] bg-white rounded-[14px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
      >
        <X size={20} />
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#1d4ed8]">
          {icon}
        </div>
        <h2 className="text-[18px] font-bold text-[#041627]">{title}</h2>
      </div>
      {children}
    </div>
  </div>
);

// ── Tabela Genérica ────────────────────────────────────────────────────────────
const SectionTable = ({
  headers, rows, isLoading, emptyMsg,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  isLoading: boolean;
  emptyMsg: string;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <Loader2 className="w-6 h-6 text-[#0058be] animate-spin" />
        <span className="text-[13px] text-[#74777d]">Carregando...</span>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-[#e4e2e3] rounded-[10px] flex items-center justify-center py-12">
        <p className="text-[13px] text-[#74777d]">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-[10px] border border-[#e4e2e3] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e4e2e3]">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-[11px] font-bold text-[#74777d] uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efedef]">
            {rows.map((cells, ri) => (
              <tr key={ri} className="hover:bg-[#fbf9fa] transition-colors">
                {cells.map((cell, ci) => (
                  <td key={ci} className="px-5 py-3.5 text-[13px] text-[#44474c]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-[#e4e2e3] bg-[#f8fafc]">
        <span className="text-[11px] text-[#74777d]">
          <span className="font-bold text-[#1b1c1d]">{rows.length}</span> registro{rows.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const isAdmin = useHasRole("Admin");
  const [activeTab, setActiveTab] = useState<TabId>("companies");

  // Acesso negado para não-Admin
  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 bg-[#fbf9fa]">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <Lock size={28} className="text-red-400" />
        </div>
        <h2 className="text-[20px] font-bold text-[#041627]">Acesso Restrito</h2>
        <p className="text-[14px] text-[#74777d] text-center max-w-sm">
          Esta área é exclusiva para administradores do sistema.
          Contate um Admin caso precise de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#fbf9fa]">
      {/* ── Sidebar de navegação interna ──────────────────────────────────── */}
      <nav
        className="w-[220px] shrink-0 flex flex-col border-r bg-white"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#041627] leading-none">Administração</p>
              <p className="text-[10px] text-[#74777d] mt-0.5">Painel de controle</p>
            </div>
          </div>
        </div>

        {/* Itens de navegação */}
        <div className="flex-1 py-3 overflow-y-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-colors"
                style={{
                  backgroundColor: isActive
                    ? tab.danger ? "rgba(239,68,68,0.08)" : "var(--color-accent-dim)"
                    : "transparent",
                  color: isActive
                    ? tab.danger ? "#dc2626" : "var(--color-accent-text)"
                    : tab.danger ? "#ef4444" : "var(--color-text-muted)",
                  borderRight: isActive
                    ? `2px solid ${tab.danger ? "#dc2626" : "var(--color-accent)"}`
                    : "2px solid transparent",
                }}
              >
                {tab.icon}
                <span className="flex-1 text-left">{tab.label}</span>
                {isActive && <ChevronRight size={13} />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Conteúdo da aba ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === "companies" && <CompaniesTab />}
        {activeTab === "sectors"   && <SectorsTab />}
        {activeTab === "letters"   && <LettersTab />}
        {activeTab === "shifts"    && <ShiftsTab />}
        {activeTab === "patterns"  && <PatternsTab />}
        {activeTab === "generate"  && <GenerateTab />}
        {activeTab === "reset"     && <ResetTab />}
        {activeTab === "promote"   && <PromoteTab />}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: EMPRESAS
// ══════════════════════════════════════════════════════════════════════════════
function CompaniesTab() {
  const [items, setItems] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateCompanyDTO>({ name: "", isOutsource: false });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setItems(await adminService.getCompanies()); } catch { setItems([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.name.trim()) { setFeedback({ type: "error", msg: "Nome é obrigatório." }); return; }
    setIsSaving(true);
    try {
      await adminService.createCompany(form);
      setFeedback({ type: "success", msg: "Empresa criada com sucesso!" });
      setForm({ name: "", isOutsource: false });
      setIsOpen(false);
      load();
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao criar empresa.") });
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Empresas"
      icon={<Building2 size={20} className="text-[#0058be]" />}
      description="Cadastre empresas cliente e terceirizadas."
      onAdd={() => { setFeedback(null); setIsOpen(true); }}
    >
      {feedback && (
        <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />
      )}
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Nenhuma empresa cadastrada."
        headers={["#", "Nome", "Tipo"]}
        rows={items.map((c) => [
          <span className="font-mono text-[12px] text-[#74777d]">#{c.id}</span>,
          <span className="font-semibold text-[#1b1c1d]">{c.name}</span>,
          <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase ${c.isOutsource ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
            {c.isOutsource ? "Terceirizada" : "Própria"}
          </span>,
        ])}
      />
      {isOpen && (
        <Modal title="Nova Empresa" icon={<Building2 size={18} />} onClose={() => setIsOpen(false)}>
          {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <InputField
              label="Nome da empresa" id="co-name" type="text" required
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="co-outsource"
                className="w-4 h-4 rounded"
                style={{ accentColor: "var(--color-accent)" }}
                checked={form.isOutsource}
                onChange={(e) => setForm({ ...form, isOutsource: e.target.checked })}
              />
              <label htmlFor="co-outsource" className="text-[13px] font-medium text-[#44474c]">
                Empresa terceirizada
              </label>
            </div>
            <ModalFooter onCancel={() => setIsOpen(false)} isSaving={isSaving} />
          </form>
        </Modal>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: SETORES
// ══════════════════════════════════════════════════════════════════════════════
function SectorsTab() {
  const [items, setItems] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateSectorDTO>({ name: "", companyId: 0, defaultShiftPatternId: null });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, c, p] = await Promise.all([
        adminService.getSectors().catch(() => []),
        adminService.getCompanies().catch(() => []),
        adminService.getShiftPatterns().catch(() => []),
      ]);
      setItems(s); setCompanies(c); setPatterns(p);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.name.trim() || !form.companyId) {
      setFeedback({ type: "error", msg: "Nome e empresa são obrigatórios." }); return;
    }
    setIsSaving(true);
    try {
      await adminService.createSector(form);
      setFeedback({ type: "success", msg: "Setor criado com sucesso!" });
      setIsOpen(false); setForm({ name: "", companyId: 0, defaultShiftPatternId: null }); load();
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao criar setor.") });
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Setores"
      icon={<Layers size={20} className="text-[#0058be]" />}
      description="Setores agrupam equipes de escala por empresa."
      onAdd={() => { setFeedback(null); setIsOpen(true); }}
    >
      {feedback && !isOpen && (
        <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />
      )}
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Nenhum setor cadastrado."
        headers={["#", "Nome", "Empresa", "Padrão Padrão"]}
        rows={items.map((s) => {
          const co = companies.find((c) => c.id === s.companyId);
          const pat = patterns.find((p) => p.id === s.defaultShiftPatternId);
          return [
            <span className="font-mono text-[12px] text-[#74777d]">#{s.id}</span>,
            <span className="font-semibold text-[#1b1c1d]">{s.name}</span>,
            co ? <span>{co.name}</span> : <span className="text-[#c4c6cd]">—</span>,
            pat
              ? <span className="text-[12px] font-mono">{pat.name ?? `Padrão #${pat.id}`}</span>
              : <span className="text-[#c4c6cd]">—</span>,
          ];
        })}
      />
      {isOpen && (
        <Modal title="Novo Setor" icon={<Layers size={18} />} onClose={() => setIsOpen(false)}>
          {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <InputField
              label="Nome do setor" id="sec-name" type="text" required
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <SelectField
              label="Empresa *" value={String(form.companyId)}
              onChange={(v) => setForm({ ...form, companyId: Number(v) })}
            >
              <option value="0">Selecione...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectField>
            <SelectField
              label="Padrão de Turno padrão (opcional)"
              value={String(form.defaultShiftPatternId ?? "")}
              onChange={(v) => setForm({ ...form, defaultShiftPatternId: v ? Number(v) : null })}
            >
              <option value="">Nenhum</option>
              {patterns.map((p) => (
                <option key={p.id} value={p.id}>{p.name ?? `Padrão #${p.id}`} — {p.sequence}</option>
              ))}
            </SelectField>
            <ModalFooter onCancel={() => setIsOpen(false)} isSaving={isSaving} />
          </form>
        </Modal>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: EQUIPES (Letters)
// ══════════════════════════════════════════════════════════════════════════════
function LettersTab() {
  const [items, setItems] = useState<Letter[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<Letter | null>(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateLetterDTO>({ name: "", sectorId: 0, patternOffset: 0 });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [l, s] = await Promise.all([
        adminService.getLetters().catch(() => []),
        adminService.getSectors().catch(() => []),
      ]);
      setItems(l); setSectors(s);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", sectorId: 0, patternOffset: 0 });
    setFeedback(null); setIsOpen(true);
  };
  const openEdit = (letter: Letter) => {
    setEditItem(letter);
    setForm({ name: letter.name, sectorId: letter.sectorId, patternOffset: letter.patternOffset });
    setFeedback(null); setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.name.trim() || !form.sectorId) {
      setFeedback({ type: "error", msg: "Nome e setor são obrigatórios." }); return;
    }
    setIsSaving(true);
    try {
      if (editItem) {
        await adminService.updateLetter(editItem.id, form);
        setFeedback({ type: "success", msg: "Equipe atualizada!" });
      } else {
        await adminService.createLetter(form);
        setFeedback({ type: "success", msg: "Equipe criada com sucesso!" });
      }
      setIsOpen(false); load();
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao salvar equipe.") });
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Equipes (Letters)"
      icon={<Tags size={20} className="text-[#0058be]" />}
      description="Equipes identificam grupos de operadores numa escala rotativa."
      onAdd={openCreate}
    >
      {feedback && !isOpen && (
        <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />
      )}
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Nenhuma equipe cadastrada."
        headers={["#", "Nome", "Setor", "Offset", ""]}
        rows={items.map((l) => {
          const sec = sectors.find((s) => s.id === l.sectorId);
          return [
            <span className="font-mono text-[12px] text-[#74777d]">#{l.id}</span>,
            <span className="font-bold text-[#1b1c1d] text-[15px]">{l.name}</span>,
            sec ? <span>{sec.name}</span> : <span className="text-[#c4c6cd]">—</span>,
            <span className="font-mono text-[12px]">{l.patternOffset}</span>,
            <button
              onClick={() => openEdit(l)}
              className="text-[12px] font-semibold text-[#0058be] hover:underline"
            >
              Editar
            </button>,
          ];
        })}
      />
      {isOpen && (
        <Modal
          title={editItem ? `Editar Equipe "${editItem.name}"` : "Nova Equipe"}
          icon={<Tags size={18} />}
          onClose={() => setIsOpen(false)}
        >
          {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <InputField
              label="Nome da equipe" id="lt-name" type="text" required
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <SelectField
              label="Setor *" value={String(form.sectorId)}
              onChange={(v) => setForm({ ...form, sectorId: Number(v) })}
            >
              <option value="0">Selecione...</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </SelectField>
            <InputField
              label="Pattern Offset" id="lt-offset" type="number"
              hint="Deslocamento na sequência do padrão de turno (0 = começa no início)."
              value={String(form.patternOffset)}
              onChange={(e) => setForm({ ...form, patternOffset: Number(e.target.value) })}
            />
            <ModalFooter
              onCancel={() => setIsOpen(false)}
              isSaving={isSaving}
              saveLabel={editItem ? "Salvar Alterações" : "Criar Equipe"}
            />
          </form>
        </Modal>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: TURNOS (Shifts)
// ══════════════════════════════════════════════════════════════════════════════
function ShiftsTab() {
  const [items, setItems] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateShiftDTO>({ name: "", startTime: "06:00", endTime: "14:00", isDayOff: false });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setItems(await adminService.getShifts()); } catch { setItems([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.name.trim()) { setFeedback({ type: "error", msg: "Nome é obrigatório." }); return; }
    setIsSaving(true);
    try {
      await adminService.createShift(form);
      setFeedback({ type: "success", msg: "Turno criado!" });
      setIsOpen(false); setForm({ name: "", startTime: "06:00", endTime: "14:00", isDayOff: false }); load();
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao criar turno.") });
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Turnos (Shifts)"
      icon={<Clock size={20} className="text-[#0058be]" />}
      description="Configure os tipos de turno: Manhã, Tarde, Noite, Folga."
      onAdd={() => { setFeedback(null); setIsOpen(true); }}
    >
      {feedback && !isOpen && (
        <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />
      )}
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Nenhum turno cadastrado."
        headers={["#", "Nome", "Início", "Fim", "Folga"]}
        rows={items.map((s) => [
          <span className="font-mono text-[12px] text-[#74777d]">#{s.id}</span>,
          <span className="font-semibold text-[#1b1c1d]">{s.name}</span>,
          <span className="font-mono text-[12px]">{s.startTime?.slice(0, 5) ?? "—"}</span>,
          <span className="font-mono text-[12px]">{s.endTime?.slice(0, 5) ?? "—"}</span>,
          s.isDayOff
            ? <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-100 text-emerald-700">SIM</span>
            : <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-zinc-100 text-zinc-500">NÃO</span>,
        ])}
      />
      {isOpen && (
        <Modal title="Novo Turno" icon={<Clock size={18} />} onClose={() => setIsOpen(false)}>
          {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <InputField
              label="Nome do turno" id="sh-name" type="text" required placeholder="Ex: Manhã, Tarde, Noite, Folga"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Hora de início" id="sh-start" type="time"
                value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
              <InputField
                label="Hora de fim" id="sh-end" type="time"
                value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="sh-dayoff"
                className="w-4 h-4 rounded"
                style={{ accentColor: "var(--color-accent)" }}
                checked={form.isDayOff}
                onChange={(e) => setForm({ ...form, isDayOff: e.target.checked })}
              />
              <label htmlFor="sh-dayoff" className="text-[13px] font-medium text-[#44474c]">
                É um dia de folga
              </label>
            </div>
            <ModalFooter onCancel={() => setIsOpen(false)} isSaving={isSaving} />
          </form>
        </Modal>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: PADRÕES DE TURNO (ShiftPatterns)
// ══════════════════════════════════════════════════════════════════════════════
function PatternsTab() {
  const [items, setItems] = useState<ShiftPattern[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateShiftPatternDTO>({ name: "", sequence: "" });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, s] = await Promise.all([
        adminService.getShiftPatterns().catch(() => []),
        adminService.getShifts().catch(() => []),
      ]);
      setItems(p); setShifts(s);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.sequence.trim()) { setFeedback({ type: "error", msg: "Sequência é obrigatória." }); return; }
    setIsSaving(true);
    try {
      await adminService.createShiftPattern(form);
      setFeedback({ type: "success", msg: "Padrão criado!" });
      setIsOpen(false); setForm({ name: "", sequence: "" }); load();
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao criar padrão.") });
    } finally { setIsSaving(false); }
  };

  const parseSequence = (seq: string): string => {
    const ids = seq.split(",").map((s) => Number(s.trim())).filter(Boolean);
    return ids.map((id) => {
      const shift = shifts.find((s) => s.id === id);
      return shift ? shift.name : `#${id}`;
    }).join(" → ");
  };

  return (
    <Section
      title="Padrões de Turno"
      icon={<GitBranch size={20} className="text-[#0058be]" />}
      description="Sequências de turnos que definem a rotatividade das equipes."
      onAdd={() => { setFeedback(null); setIsOpen(true); }}
    >
      {feedback && !isOpen && (
        <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />
      )}
      {shifts.length > 0 && (
        <div className="mb-4 p-3 bg-[#f0f4ff] rounded-[8px] border border-[#c7d7fc]">
          <p className="text-[11px] font-bold text-[#0058be] uppercase tracking-wider mb-1.5">IDs disponíveis dos Turnos</p>
          <div className="flex flex-wrap gap-1.5">
            {shifts.map((s) => (
              <span key={s.id} className="px-2 py-0.5 bg-white border border-[#c7d7fc] rounded-[4px] text-[11px] font-mono font-bold text-[#1d4ed8]">
                {s.id} = {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Nenhum padrão de turno cadastrado."
        headers={["#", "Nome", "Sequência (IDs)", "Sequência (Nomes)"]}
        rows={items.map((p) => [
          <span className="font-mono text-[12px] text-[#74777d]">#{p.id}</span>,
          <span className="font-semibold text-[#1b1c1d]">{p.name ?? "—"}</span>,
          <span className="font-mono text-[11px] bg-zinc-100 px-2 py-0.5 rounded">{p.sequence}</span>,
          <span className="text-[12px] text-[#44474c]">{parseSequence(p.sequence)}</span>,
        ])}
      />
      {isOpen && (
        <Modal title="Novo Padrão de Turno" icon={<GitBranch size={18} />} onClose={() => setIsOpen(false)}>
          {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <InputField
              label="Nome (opcional)" id="pt-name" type="text"
              value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <InputField
              label="Sequência de IDs de Turno *" id="pt-seq" type="text" required
              placeholder="Ex: 1,2,3,4 (IDs separados por vírgula)"
              hint="Use os IDs dos turnos cadastrados acima, na ordem de rotação."
              value={form.sequence} onChange={(e) => setForm({ ...form, sequence: e.target.value })}
            />
            {form.sequence && (
              <div className="p-3 bg-[#f0f4ff] rounded-[8px] text-[12px] text-[#0058be] font-medium">
                Preview: {parseSequence(form.sequence)}
              </div>
            )}
            <ModalFooter onCancel={() => setIsOpen(false)} isSaving={isSaving} />
          </form>
        </Modal>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: GERAR ESCALA
// ══════════════════════════════════════════════════════════════════════════════
function GenerateTab() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<GenerateRotationDTO>({
    startDate: today,
    endDate: today,
    sectorId: 0,
    shiftPatternId: 0,
  });

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      adminService.getSectors().catch(() => []),
      adminService.getShiftPatterns().catch(() => []),
    ]).then(([s, p]) => { setSectors(s); setPatterns(p); }).finally(() => setIsLoading(false));
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.sectorId || !form.shiftPatternId) {
      setFeedback({ type: "error", msg: "Selecione o setor e o padrão de turno." }); return;
    }
    if (form.endDate < form.startDate) {
      setFeedback({ type: "error", msg: "Data de fim não pode ser anterior à data de início." }); return;
    }
    setIsSaving(true);
    try {
      const res = await adminService.generateRotation(form);
      setFeedback({ type: "success", msg: res.mensagem ?? "Escala gerada com sucesso!" });
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao gerar escala.") });
    } finally { setIsSaving(false); }
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center shrink-0">
          <CalendarCog size={20} className="text-[#1d4ed8]" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[#041627]">Gerar Escala Rotativa</h2>
          <p className="text-[13px] text-[#74777d] mt-0.5">
            Gera automaticamente os dias de escala para todas as equipes do setor no período informado.
          </p>
        </div>
      </div>

      {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8">
          <Loader2 className="w-5 h-5 text-[#0058be] animate-spin" /> <span className="text-[13px] text-[#74777d]">Carregando...</span>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="bg-white rounded-[12px] border border-[#e4e2e3] shadow-sm p-6 flex flex-col gap-5 max-w-[520px]">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Data de Início *" id="gen-start" type="date" required
              value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <InputField label="Data de Fim *" id="gen-end" type="date" required
              min={form.startDate} value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <SelectField
            label="Setor *" value={String(form.sectorId)}
            onChange={(v) => setForm({ ...form, sectorId: Number(v) })}
          >
            <option value="0">Selecione o setor...</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </SelectField>
          <SelectField
            label="Padrão de Turno *" value={String(form.shiftPatternId)}
            onChange={(v) => setForm({ ...form, shiftPatternId: Number(v) })}
          >
            <option value="0">Selecione o padrão...</option>
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>{p.name ?? `Padrão #${p.id}`} — {p.sequence}</option>
            ))}
          </SelectField>
          <div className="flex justify-end pt-2 border-t border-[#efedef]">
            <Button
              type="submit" disabled={isSaving}
              className="w-auto px-6 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold"
            >
              {isSaving
                ? <><Loader2 size={15} className="animate-spin" /> Gerando...</>
                : <><RefreshCw size={15} /> Gerar Escala</>}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: ZERAR ESCALA (ação destrutiva)
// ══════════════════════════════════════════════════════════════════════════════
function ResetTab() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const canConfirm = confirmText === "CONFIRMAR";

  const handleReset = async () => {
    if (!canConfirm) return;
    setIsResetting(true);
    setFeedback(null);
    try {
      const res = await adminService.resetEscala();
      setFeedback({ type: "success", msg: res.mensagem ?? "Escala zerada com sucesso." });
      setIsConfirmOpen(false);
      setConfirmText("");
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao zerar escala.") });
    } finally { setIsResetting(false); }
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-red-700">Zerar Escala</h2>
          <p className="text-[13px] text-[#74777d] mt-0.5">
            Remove <strong>todos</strong> os dias de escala do banco de dados. Ação irreversível.
          </p>
        </div>
      </div>

      {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}

      <div className="bg-red-50 border border-red-200 rounded-[12px] p-6 max-w-[520px]">
        <div className="flex items-start gap-3 mb-5">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[14px] font-bold text-red-700">Atenção — esta ação é irreversível!</p>
            <ul className="text-[13px] text-red-600 mt-2 space-y-1 list-disc list-inside">
              <li>Todos os dias de escala serão apagados.</li>
              <li>Trocas de turno associadas podem ser afetadas.</li>
              <li>Esta operação não pode ser desfeita.</li>
            </ul>
          </div>
        </div>
        <button
          onClick={() => { setIsConfirmOpen(true); setConfirmText(""); setFeedback(null); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[6px] text-[13px] font-bold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors"
        >
          <Trash2 size={15} /> Zerar Toda a Escala
        </button>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
            onClick={() => setIsConfirmOpen(false)}
          />
          <div className="relative w-full max-w-[420px] bg-white rounded-[14px] shadow-2xl p-8">
            <button
              onClick={() => setIsConfirmOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <h3 className="text-[17px] font-bold text-red-700">Confirmação Final</h3>
            </div>
            <p className="text-[13px] text-[#44474c] mb-4">
              Para confirmar, digite <span className="font-bold text-red-600 font-mono bg-red-50 px-1.5 py-0.5 rounded">CONFIRMAR</span> no campo abaixo:
            </p>
            <input
              type="text"
              className="w-full h-[40px] px-3 text-[14px] font-mono font-bold border-2 rounded-[6px] focus:outline-none transition-colors"
              style={{
                borderColor: canConfirm ? "#dc2626" : "#e4e2e3",
                backgroundColor: canConfirm ? "#fef2f2" : "#fbf9fa",
                color: "#041627",
              }}
              placeholder="Digite CONFIRMAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 h-[40px] rounded-[6px] border border-[#e4e2e3] text-[13px] font-semibold text-[#44474c] hover:bg-[#f8fafc] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={!canConfirm || isResetting}
                className="flex-1 h-[40px] rounded-[6px] text-[13px] font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: canConfirm ? "#dc2626" : "#ef4444" }}
              >
                {isResetting
                  ? <><Loader2 size={14} className="animate-spin" /> Zerando...</>
                  : <><Trash2 size={14} /> Zerar Agora</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: PROMOVER USUÁRIO
// ══════════════════════════════════════════════════════════════════════════════
function PromoteTab() {
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [cargos, setCargos] = useState<string[]>([]);
  const [selectedCargo, setSelectedCargo] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  useEffect(() => {
    adminService.listCargos().then(setCargos).catch(() => setCargos([]));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFoundUser(null); setSearchError(null); setFeedback(null); setSelectedCargo("");
    if (!searchEmail.trim()) { setSearchError("Informe um e-mail."); return; }
    setIsSearching(true);
    try {
      const user = await usersService.getUserByEmail(searchEmail.trim());
      setFoundUser(user);
    } catch (err) {
      setSearchError(
        axios.isAxiosError(err) && err.response?.status === 404
          ? "Usuário não encontrado."
          : apiError(err, "Erro ao buscar usuário.")
      );
    } finally { setIsSearching(false); }
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser || !selectedCargo) return;
    setFeedback(null);
    setIsPromoting(true);
    try {
      const res = await adminService.promoteUser({ email: foundUser.user, cargo: selectedCargo });
      setFeedback({ type: "success", msg: res.mensagem ?? `${foundUser.completeName} promovido para ${selectedCargo}!` });
      setFoundUser(null); setSearchEmail(""); setSelectedCargo("");
    } catch (err) {
      setFeedback({ type: "error", msg: apiError(err, "Erro ao promover usuário.") });
    } finally { setIsPromoting(false); }
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center shrink-0">
          <UserCog size={20} className="text-[#1d4ed8]" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[#041627]">Promover Usuário</h2>
          <p className="text-[13px] text-[#74777d] mt-0.5">
            Busque um usuário pelo e-mail e altere seu cargo no sistema.
          </p>
        </div>
      </div>

      {feedback && <Feedback type={feedback.type} message={feedback.msg} onClose={() => setFeedback(null)} />}

      <div className="max-w-[520px] flex flex-col gap-5">
        {/* Busca de usuário */}
        <div className="bg-white rounded-[12px] border border-[#e4e2e3] shadow-sm p-5">
          <p className="text-[12px] font-bold text-[#74777d] uppercase tracking-wider mb-3">
            1 — Buscar Usuário
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="email"
              placeholder="operador@empresa.com"
              className="flex-1 h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[6px] focus:outline-none focus:border-[#0058be] transition-colors"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isSearching}
              className="h-[40px] px-4 rounded-[6px] text-[13px] font-bold bg-[#1d4ed8] text-white hover:bg-[#1e40af] disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : null}
              Buscar
            </button>
          </form>
          {searchError && (
            <p className="text-[12px] text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle size={12} /> {searchError}
            </p>
          )}

          {/* Resultado da busca */}
          {foundUser && (
            <div className="mt-4 p-3 bg-[#f0f4ff] border border-[#c7d7fc] rounded-[8px] flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0"
                style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent-text)" }}
              >
                {(foundUser.completeName || foundUser.user).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#041627]">
                  {foundUser.completeName || "—"}
                </p>
                <p className="text-[12px] text-[#74777d]">{foundUser.user}</p>
              </div>
              <CheckCircle2 size={18} className="text-emerald-500 ml-auto shrink-0" />
            </div>
          )}
        </div>

        {/* Selecionar cargo e confirmar */}
        {foundUser && (
          <div className="bg-white rounded-[12px] border border-[#e4e2e3] shadow-sm p-5">
            <p className="text-[12px] font-bold text-[#74777d] uppercase tracking-wider mb-3">
              2 — Definir Novo Cargo
            </p>
            <form onSubmit={handlePromote} className="flex flex-col gap-4">
              <SelectField
                label="Novo cargo *" value={selectedCargo}
                onChange={(v) => setSelectedCargo(v)}
              >
                <option value="">Selecione um cargo...</option>
                {cargos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </SelectField>
              <div className="flex justify-end pt-2 border-t border-[#efedef]">
                <Button
                  type="submit" disabled={!selectedCargo || isPromoting}
                  className="w-auto px-6 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold"
                >
                  {isPromoting
                    ? <><Loader2 size={14} className="animate-spin" /> Promovendo...</>
                    : <><UserCog size={14} /> Confirmar Promoção</>}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componentes auxiliares compartilhados ──────────────────────────────────────

function Section({
  title, icon, description, onAdd, children,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-[#041627]">{title}</h2>
            <p className="text-[13px] text-[#74777d] mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-bold bg-[#1d4ed8] text-white hover:bg-[#1e40af] active:bg-[#1e3a8a] transition-colors shrink-0"
        >
          <Plus size={15} /> Novo
        </button>
      </div>
      {children}
    </div>
  );
}

function SelectField({
  label, value, onChange, children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-[#44474c] uppercase tracking-wider">
        {label}
      </label>
      <select
        className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[6px] focus:outline-none focus:border-[#0058be] transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function ModalFooter({
  onCancel, isSaving, saveLabel = "Criar",
}: {
  onCancel: () => void;
  isSaving: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2 border-t border-[#efedef] mt-2">
      <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      <Button
        type="submit" disabled={isSaving}
        className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold"
      >
        {isSaving ? "Salvando..." : saveLabel}
      </Button>
    </div>
  );
}
