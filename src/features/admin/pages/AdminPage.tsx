import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, Building2, Layers, Tags, Clock, GitBranch,
  CalendarCog, Trash2, UserCog, Plus, Loader2, AlertCircle,
  CheckCircle2, RefreshCw, ChevronRight, Lock,
} from "lucide-react";
import axios from "axios";
import { useHasRole } from "../../../lib/useHasRole";
import { adminService } from "../api/adminService";
import { usersService, type User } from "../../users/api/usersService";
import { Button } from "../../../components/ui/Button";
import { InputField } from "../../../components/ui/InputField";
import { Modal } from "../../../components/ui/Modal";
import { useToastStore } from "../../../lib/toastStore";
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

// ── Tabela Genérica ────────────────────────────────────────────────────────────
const SectionTable = ({
  headers, rows, isLoading, emptyMsg, emptyIcon
}: {
  headers: string[];
  rows: React.ReactNode[][];
  isLoading: boolean;
  emptyMsg: string;
  emptyIcon?: React.ReactNode;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-text-faint)]">Carregando...</span>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 bg-[var(--color-surface-dim)] text-[var(--color-text-faint)] rounded-full flex items-center justify-center mb-4">
          {emptyIcon}
        </div>
        <p className="text-[15px] font-bold text-[var(--color-text)]">Nenhum registro encontrado</p>
        <p className="text-[13px] text-[var(--color-text-muted)] mt-1">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="bg-[var(--color-surface)] rounded-[10px] border border-[var(--color-border)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-dim)] border-b border-[var(--color-border)]">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-[11px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {rows.map((cells, ri) => (
              <tr key={ri} className="hover:bg-[var(--color-surface-raised)] transition-colors">
                {cells.map((cell, ci) => (
                  <td key={ci} className="px-5 py-3.5 text-[13px] text-[var(--color-text-muted)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-dim)]">
        <span className="text-[11px] text-[var(--color-text-faint)]">
          <span className="font-bold text-[var(--color-text)]">{rows.length}</span> registro{rows.length !== 1 ? "s" : ""}
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 bg-[var(--color-bg)]">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-error-subtle)] flex items-center justify-center">
          <Lock size={28} className="text-[var(--color-error)]" />
        </div>
        <h2 className="text-[20px] font-bold text-[var(--color-text)]">Acesso Restrito</h2>
        <p className="text-[14px] text-[var(--color-text-faint)] text-center max-w-sm">
          Esta área é exclusiva para administradores do sistema.
          Contate um Admin caso precise de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[var(--color-bg)] font-sans">
      {/* ── Sidebar de navegação interna ──────────────────────────────────── */}
      <nav
        className="w-[220px] shrink-0 flex flex-col border-r bg-[var(--color-surface)]"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-hover)] flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[var(--color-text)] leading-none">Administração</p>
              <p className="text-[10px] text-[var(--color-text-faint)] mt-0.5">Painel de controle</p>
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
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-[var(--color-surface-dim)]"
                style={{
                  backgroundColor: isActive
                    ? tab.danger ? "var(--color-error-subtle)" : "var(--color-accent-subtle)"
                    : "transparent",
                  color: isActive
                    ? tab.danger ? "var(--color-error)" : "var(--color-accent-text)"
                    : tab.danger ? "var(--color-error)" : "var(--color-text-muted)",
                  borderRight: isActive
                    ? `2px solid ${tab.danger ? "var(--color-error)" : "var(--color-accent)"}`
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
  const showToast = useToastStore((s) => s.showToast);
  const [items, setItems] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateCompanyDTO>({ name: "", isOutsource: false });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setItems(await adminService.getCompanies()); } catch { setItems([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Nome é obrigatório.", "error"); return; }
    setIsSaving(true);
    try {
      await adminService.createCompany(form);
      showToast("Empresa criada com sucesso!", "success");
      setForm({ name: "", isOutsource: false });
      setIsOpen(false);
      load();
    } catch (err) {
      showToast(apiError(err, "Erro ao criar empresa."), "error");
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Empresas"
      icon={<Building2 size={20} className="text-[var(--color-accent)]" />}
      description="Cadastre empresas cliente e terceirizadas."
      onAdd={() => { setIsOpen(true); }}
    >
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Adicione uma empresa para começar."
        emptyIcon={<Building2 size={32} />}
        headers={["#", "Nome", "Tipo"]}
        rows={items.map((c) => [
          <span className="font-mono text-[12px] text-[var(--color-text-faint)]">#{c.id}</span>,
          <span className="font-semibold text-[var(--color-text)]">{c.name}</span>,
          <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase ${c.isOutsource ? "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]" : "bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]"}`}>
            {c.isOutsource ? "Terceirizada" : "Própria"}
          </span>,
        ])}
      />
      {isOpen && (
        <Modal title="Nova Empresa" icon={<Building2 size={18} className="text-[var(--color-accent)]" />} onClose={() => setIsOpen(false)}>
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
              <label htmlFor="co-outsource" className="text-[13px] font-medium text-[var(--color-text-muted)]">
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
  const showToast = useToastStore((s) => s.showToast);
  const [items, setItems] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
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
    if (!form.name.trim() || !form.companyId) {
      showToast("Nome e empresa são obrigatórios.", "error"); return;
    }
    setIsSaving(true);
    try {
      await adminService.createSector(form);
      showToast("Setor criado com sucesso!", "success");
      setIsOpen(false); setForm({ name: "", companyId: 0, defaultShiftPatternId: null }); load();
    } catch (err) {
      showToast(apiError(err, "Erro ao criar setor."), "error");
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Setores"
      icon={<Layers size={20} className="text-[var(--color-accent)]" />}
      description="Setores agrupam equipes de escala por empresa."
      onAdd={() => { setIsOpen(true); }}
    >
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Adicione um setor para começar."
        emptyIcon={<Layers size={32} />}
        headers={["#", "Nome", "Empresa", "Padrão Padrão"]}
        rows={items.map((s) => {
          const co = companies.find((c) => c.id === s.companyId);
          const pat = patterns.find((p) => p.id === s.defaultShiftPatternId);
          return [
            <span className="font-mono text-[12px] text-[var(--color-text-faint)]">#{s.id}</span>,
            <span className="font-semibold text-[var(--color-text)]">{s.name}</span>,
            co ? <span>{co.name}</span> : <span className="text-[var(--color-border)]">—</span>,
            pat
              ? <span className="text-[12px] font-mono">{pat.name ?? `Padrão #${pat.id}`}</span>
              : <span className="text-[var(--color-border)]">—</span>,
          ];
        })}
      />
      {isOpen && (
        <Modal title="Novo Setor" icon={<Layers size={18} className="text-[var(--color-accent)]" />} onClose={() => setIsOpen(false)}>
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
  const showToast = useToastStore((s) => s.showToast);
  const [items, setItems] = useState<Letter[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<Letter | null>(null);
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
    setIsOpen(true);
  };
  const openEdit = (letter: Letter) => {
    setEditItem(letter);
    setForm({ name: letter.name, sectorId: letter.sectorId, patternOffset: letter.patternOffset });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sectorId) {
      showToast("Nome e setor são obrigatórios.", "error"); return;
    }
    setIsSaving(true);
    try {
      if (editItem) {
        await adminService.updateLetter(editItem.id, form);
        showToast("Equipe atualizada!", "success");
      } else {
        await adminService.createLetter(form);
        showToast("Equipe criada com sucesso!", "success");
      }
      setIsOpen(false); load();
    } catch (err) {
      showToast(apiError(err, "Erro ao salvar equipe."), "error");
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Equipes (Letters)"
      icon={<Tags size={20} className="text-[var(--color-accent)]" />}
      description="Equipes identificam grupos de operadores numa escala rotativa."
      onAdd={openCreate}
    >
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Adicione uma equipe para começar."
        emptyIcon={<Tags size={32} />}
        headers={["#", "Nome", "Setor", "Offset", ""]}
        rows={items.map((l) => {
          const sec = sectors.find((s) => s.id === l.sectorId);
          return [
            <span className="font-mono text-[12px] text-[var(--color-text-faint)]">#{l.id}</span>,
            <span className="font-bold text-[var(--color-text)] text-[15px]">{l.name}</span>,
            sec ? <span>{sec.name}</span> : <span className="text-[var(--color-border)]">—</span>,
            <span className="font-mono text-[12px]">{l.patternOffset}</span>,
            <button
              onClick={() => openEdit(l)}
              className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Editar
            </button>,
          ];
        })}
      />
      {isOpen && (
        <Modal
          title={editItem ? `Editar Equipe "${editItem.name}"` : "Nova Equipe"}
          icon={<Tags size={18} className="text-[var(--color-accent)]" />}
          onClose={() => setIsOpen(false)}
        >
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
  const showToast = useToastStore((s) => s.showToast);
  const [items, setItems] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateShiftDTO>({ name: "", startTime: "06:00", endTime: "14:00", isDayOff: false });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setItems(await adminService.getShifts()); } catch { setItems([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Nome é obrigatório.", "error"); return; }
    setIsSaving(true);
    try {
      await adminService.createShift(form);
      showToast("Turno criado!", "success");
      setIsOpen(false); setForm({ name: "", startTime: "06:00", endTime: "14:00", isDayOff: false }); load();
    } catch (err) {
      showToast(apiError(err, "Erro ao criar turno."), "error");
    } finally { setIsSaving(false); }
  };

  return (
    <Section
      title="Turnos (Shifts)"
      icon={<Clock size={20} className="text-[var(--color-accent)]" />}
      description="Configure os tipos de turno: Manhã, Tarde, Noite, Folga."
      onAdd={() => { setIsOpen(true); }}
    >
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Nenhum turno cadastrado."
        emptyIcon={<Clock size={32} />}
        headers={["#", "Nome", "Início", "Fim", "Folga"]}
        rows={items.map((s) => [
          <span className="font-mono text-[12px] text-[var(--color-text-faint)]">#{s.id}</span>,
          <span className="font-semibold text-[var(--color-text)]">{s.name}</span>,
          <span className="font-mono text-[12px]">{s.startTime?.slice(0, 5) ?? "—"}</span>,
          <span className="font-mono text-[12px]">{s.endTime?.slice(0, 5) ?? "—"}</span>,
          s.isDayOff
            ? <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[var(--color-success-subtle)] text-[var(--color-success)]">SIM</span>
            : <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[var(--color-surface-dim)] text-[var(--color-text-muted)]">NÃO</span>,
        ])}
      />
      {isOpen && (
        <Modal title="Novo Turno" icon={<Clock size={18} className="text-[var(--color-accent)]" />} onClose={() => setIsOpen(false)}>
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
              <label htmlFor="sh-dayoff" className="text-[13px] font-medium text-[var(--color-text-muted)]">
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
  const showToast = useToastStore((s) => s.showToast);
  const [items, setItems] = useState<ShiftPattern[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
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
    if (!form.sequence.trim()) { showToast("Sequência é obrigatória.", "error"); return; }
    setIsSaving(true);
    try {
      await adminService.createShiftPattern(form);
      showToast("Padrão criado!", "success");
      setIsOpen(false); setForm({ name: "", sequence: "" }); load();
    } catch (err) {
      showToast(apiError(err, "Erro ao criar padrão."), "error");
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
      icon={<GitBranch size={20} className="text-[var(--color-accent)]" />}
      description="Sequências de turnos que definem a rotatividade das equipes."
      onAdd={() => { setIsOpen(true); }}
    >
      {shifts.length > 0 && (
        <div className="mb-4 p-3 bg-[var(--color-accent-subtle)] rounded-[8px] border border-[var(--color-accent-dim)]">
          <p className="text-[11px] font-bold text-[var(--color-accent)] uppercase tracking-wider mb-1.5">IDs disponíveis dos Turnos</p>
          <div className="flex flex-wrap gap-1.5">
            {shifts.map((s) => (
              <span key={s.id} className="px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-accent-dim)] rounded-[4px] text-[11px] font-mono font-bold text-[var(--color-accent-text)]">
                {s.id} = {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <SectionTable
        isLoading={isLoading}
        emptyMsg="Nenhum padrão de turno cadastrado."
        emptyIcon={<GitBranch size={32} />}
        headers={["#", "Nome", "Sequência (IDs)", "Sequência (Nomes)"]}
        rows={items.map((p) => [
          <span className="font-mono text-[12px] text-[var(--color-text-faint)]">#{p.id}</span>,
          <span className="font-semibold text-[var(--color-text)]">{p.name ?? "—"}</span>,
          <span className="font-mono text-[11px] bg-[var(--color-surface-dim)] px-2 py-0.5 rounded">{p.sequence}</span>,
          <span className="text-[12px] text-[var(--color-text-muted)]">{parseSequence(p.sequence)}</span>,
        ])}
      />
      {isOpen && (
        <Modal title="Novo Padrão de Turno" icon={<GitBranch size={18} className="text-[var(--color-accent)]" />} onClose={() => setIsOpen(false)}>
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
              <div className="p-3 bg-[var(--color-accent-subtle)] rounded-[8px] text-[12px] text-[var(--color-accent)] font-medium">
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
  const showToast = useToastStore((s) => s.showToast);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    if (!form.sectorId || !form.shiftPatternId) {
      showToast("Selecione o setor e o padrão de turno.", "error"); return;
    }
    if (form.endDate < form.startDate) {
      showToast("Data de fim não pode ser anterior à data de início.", "error"); return;
    }
    setIsSaving(true);
    try {
      const res = await adminService.generateRotation(form);
      showToast(res.mensagem ?? "Escala gerada com sucesso!", "success");
    } catch (err) {
      showToast(apiError(err, "Erro ao gerar escala."), "error");
    } finally { setIsSaving(false); }
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center shrink-0">
          <CalendarCog size={20} className="text-[var(--color-accent-hover)]" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[var(--color-text)]">Gerar Escala Rotativa</h2>
          <p className="text-[13px] text-[var(--color-text-faint)] mt-0.5">
            Gera automaticamente os dias de escala para todas as equipes do setor no período informado.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8">
          <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" /> <span className="text-[13px] text-[var(--color-text-faint)]">Carregando...</span>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-border)] shadow-sm p-6 flex flex-col gap-5 max-w-[520px]">
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
          <div className="flex justify-end pt-4 border-t border-[var(--color-border-subtle)] mt-2">
            <Button
              type="submit" disabled={isSaving}
              className="w-auto px-6 bg-[var(--color-accent-hover)] hover:bg-[var(--color-accent-text)] text-white font-bold"
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
  const showToast = useToastStore((s) => s.showToast);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const canConfirm = confirmText === "CONFIRMAR";

  const handleReset = async () => {
    if (!canConfirm) return;
    setIsResetting(true);
    try {
      const res = await adminService.resetEscala();
      showToast(res.mensagem ?? "Escala zerada com sucesso.", "success");
      setIsConfirmOpen(false);
      setConfirmText("");
    } catch (err) {
      showToast(apiError(err, "Erro ao zerar escala."), "error");
    } finally { setIsResetting(false); }
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-error-subtle)] flex items-center justify-center shrink-0">
          <Trash2 size={20} className="text-[var(--color-error)]" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-red-700">Zerar Escala</h2>
          <p className="text-[13px] text-[var(--color-text-faint)] mt-0.5">
            Remove <strong className="text-red-700">todos</strong> os dias de escala do banco de dados. Ação irreversível.
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-error-subtle)] border border-[var(--color-error)] rounded-[12px] p-6 max-w-[520px]">
        <div className="flex items-start gap-3 mb-5">
          <AlertCircle size={18} className="text-[var(--color-error)] mt-0.5 shrink-0" />
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
          onClick={() => { setIsConfirmOpen(true); setConfirmText(""); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[6px] text-[13px] font-bold bg-[var(--color-error)] text-white hover:opacity-90 active:opacity-80 transition-colors"
        >
          <Trash2 size={15} /> Zerar Toda a Escala
        </button>
      </div>

      {isConfirmOpen && (
        <Modal
          title="Confirmação Final"
          icon={<Trash2 size={18} className="text-[var(--color-error)]" />}
          onClose={() => setIsConfirmOpen(false)}
          size="md"
        >
          <p className="text-[13px] text-[var(--color-text-muted)] mb-4">
            Para confirmar, digite <span className="font-bold text-red-600 font-mono bg-red-50 px-1.5 py-0.5 rounded">CONFIRMAR</span> no campo abaixo:
          </p>
          <input
            type="text"
            className="w-full h-[40px] px-3 text-[14px] font-mono font-bold border-2 rounded-[6px] focus:outline-none transition-colors mb-2"
            style={{
              borderColor: canConfirm ? "var(--color-error)" : "var(--color-border)",
              backgroundColor: canConfirm ? "var(--color-error-subtle)" : "var(--color-bg)",
              color: "var(--color-text)",
            }}
            placeholder="Digite CONFIRMAR"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3 mt-5 border-t border-[var(--color-border-subtle)] pt-4">
            <button
              onClick={() => setIsConfirmOpen(false)}
              className="flex-1 h-[40px] rounded-[6px] border border-[var(--color-border)] text-[13px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dim)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleReset}
              disabled={!canConfirm || isResetting}
              className="flex-1 h-[40px] rounded-[6px] text-[13px] font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-error)] hover:opacity-90"
            >
              {isResetting
                ? <><Loader2 size={14} className="animate-spin" /> Zerando...</>
                : <><Trash2 size={14} /> Zerar Agora</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA: PROMOVER USUÁRIO
// ══════════════════════════════════════════════════════════════════════════════
function PromoteTab() {
  const showToast = useToastStore((s) => s.showToast);
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [cargos, setCargos] = useState<string[]>([]);
  const [selectedCargo, setSelectedCargo] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    adminService.listCargos().then(setCargos).catch(() => setCargos([]));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFoundUser(null); setSearchError(null); setSelectedCargo("");
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
    setIsPromoting(true);
    try {
      const res = await adminService.promoteUser({ email: foundUser.user, cargo: selectedCargo });
      showToast(res.mensagem ?? `${foundUser.completeName} promovido para ${selectedCargo}!`, "success");
      setFoundUser(null); setSearchEmail(""); setSelectedCargo("");
    } catch (err) {
      showToast(apiError(err, "Erro ao promover usuário."), "error");
    } finally { setIsPromoting(false); }
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center shrink-0">
          <UserCog size={20} className="text-[var(--color-accent-hover)]" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[var(--color-text)]">Promover Usuário</h2>
          <p className="text-[13px] text-[var(--color-text-faint)] mt-0.5">
            Busque um usuário pelo e-mail e altere seu cargo no sistema.
          </p>
        </div>
      </div>

      <div className="max-w-[520px] flex flex-col gap-5">
        {/* Busca de usuário */}
        <div className="bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-border)] shadow-sm p-5">
          <p className="text-[12px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider mb-3">
            1 — Buscar Usuário
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="email"
              placeholder="operador@empresa.com"
              className="flex-1 h-[40px] px-3 text-[14px] text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isSearching}
              className="h-[40px] px-4 rounded-[6px] text-[13px] font-bold bg-[var(--color-accent-hover)] text-white hover:bg-[var(--color-accent-text)] disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : null}
              Buscar
            </button>
          </form>
          {searchError && (
            <p className="text-[12px] text-[var(--color-error)] mt-2 flex items-center gap-1">
              <AlertCircle size={12} /> {searchError}
            </p>
          )}

          {/* Resultado da busca */}
          {foundUser && (
            <div className="mt-4 p-3 bg-[var(--color-accent-subtle)] border border-[var(--color-accent-dim)] rounded-[8px] flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0"
                style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent-text)" }}
              >
                {(foundUser.completeName || foundUser.user).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-bold text-[var(--color-text)]">
                  {foundUser.completeName || "—"}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">{foundUser.user}</p>
              </div>
              <CheckCircle2 size={18} className="text-[var(--color-success)] ml-auto shrink-0" />
            </div>
          )}
        </div>

        {/* Selecionar cargo e confirmar */}
        {foundUser && (
          <div className="bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-border)] shadow-sm p-5">
            <p className="text-[12px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider mb-3">
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
              <div className="flex justify-end pt-4 border-t border-[var(--color-border-subtle)] mt-2">
                <Button
                  type="submit" disabled={!selectedCargo || isPromoting}
                  className="w-auto px-6 bg-[var(--color-accent-hover)] hover:bg-[var(--color-accent-text)] text-white font-bold"
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
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-[var(--color-text)]">{title}</h2>
            <p className="text-[13px] text-[var(--color-text-faint)] mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-bold bg-[var(--color-accent-hover)] text-white hover:bg-[var(--color-accent-text)] active:bg-[var(--color-accent-text)] transition-colors shrink-0"
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
      <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </label>
      <select
        className="w-full h-[40px] px-3 text-[14px] text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)] mt-2">
      <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      <Button
        type="submit" disabled={isSaving}
        className="bg-[var(--color-accent-hover)] hover:bg-[var(--color-accent-text)] text-white font-bold"
      >
        {isSaving ? "Salvando..." : saveLabel}
      </Button>
    </div>
  );
}
