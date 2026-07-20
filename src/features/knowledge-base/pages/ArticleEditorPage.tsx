import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Plus,
  Save,
  Send,
  Tag as TagIcon,
  X,
} from 'lucide-react';

import { knowledgeBaseService } from '../api/knowledgeBaseService';
import {
  ArticleStatus,
  ARTICLE_STATUS_LABELS,
  DifficultyLevel,
  DIFFICULTY_LABELS,
  type ArticleStatusType,
  type DifficultyLevelType,
  type ArticleDetail,
  type CategoryTreeNode,
  type Tag,
  type CreateKnowledgeArticleRequest,
  type UpdateKnowledgeArticleRequest,
} from '../types';
import { Button } from '../../../components/ui/Button';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';
import { TagCombobox } from '../../../components/ui/TagCombobox';
import { HelpTooltip } from '../../../components/ui/HelpTooltip';
import { useToastStore } from '../../../lib/toastStore';
import { useHasRole } from '../../../lib/useHasRole';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

function flattenTree(nodes: CategoryTreeNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: '\u00a0\u00a0'.repeat(depth) + n.name },
    ...flattenTree(n.children ?? [], depth + 1),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  summary: string;
  content: string;
  categoryId: string;
  tagIds: string[];
  status: ArticleStatusType;
  difficulty: DifficultyLevelType;
  coverImageUrl: string;
  // FIX: mantido como string em todo o ciclo do formulário — conversão para
  // number só ocorre no momento do envio ao backend (handleSubmit).
  estimatedTimeInMinutes: string;
  changeDescription: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  title: '',
  summary: '',
  content: '',
  categoryId: '',
  tagIds: [],
  status: ArticleStatus.Draft,
  difficulty: DifficultyLevel.Basic,
  coverImageUrl: '',
  estimatedTimeInMinutes: '',
  changeDescription: '',
};

// RB019: domínios de vídeo permitidos
const ALLOWED_VIDEO_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'sharepoint.com',
  'microsoftstream.com',
  'stream.microsoft.com',
];

function isAllowedVideoUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return ALLOWED_VIDEO_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

// FIX: 17 — validação de imagem de capa
const ALLOWED_IMAGE_DOMAINS = ['sharepoint.com', 'microsoftstream.com'];
function isAllowedImageUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return ALLOWED_IMAGE_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function validateVideoLinks(htmlContent: string): string | null {
  const matches = htmlContent.matchAll(/(?:href|src)="([^"]+)"/gi);
  const videoPatterns = /(?:youtube|youtu\.be|vimeo|dailymotion|twitch|stream|video)/i;
  for (const match of matches) {
    const url = match[1];
    if (videoPatterns.test(url) && !isAllowedVideoUrl(url)) {
      return `Link de vídeo não permitido. Use apenas YouTube, SharePoint ou Microsoft Stream. URL: ${url}`;
    }
  }
  return null;
}

function validate(form: FormState, isEdit: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'O título é obrigatório.';
  else if (form.title.length > 150) errors.title = 'Máximo 150 caracteres.';
  if (!form.summary.trim()) errors.summary = 'O resumo é obrigatório.';
  if (!form.content || form.content === '<p></p>' || !form.content.trim())
    errors.content = 'O conteúdo é obrigatório.';
  if (!form.categoryId) errors.categoryId = 'Selecione uma categoria.';
  if (form.tagIds.length === 0) errors.tagIds = 'Selecione pelo menos uma tag.';

  // FIX: estimatedTimeInMinutes é string — comparação e parse corretos
  const estMinParsed = parseInt(form.estimatedTimeInMinutes, 10);
  if (!form.estimatedTimeInMinutes || form.estimatedTimeInMinutes === '') {
    errors.estimatedTimeInMinutes = 'O tempo estimado é obrigatório.';
  } else if (isNaN(estMinParsed) || estMinParsed < 1) {
    errors.estimatedTimeInMinutes = 'Informe um número válido (≥ 1).';
  }

  if (isEdit && !form.changeDescription.trim())
    errors.changeDescription = 'Descreva a alteração para o log de auditoria (obrigatório em toda edição).';
  const videoError = validateVideoLinks(form.content);
  if (videoError) errors.content = videoError;
  // FIX: 17 — validação de URL da imagem de capa
  if (form.coverImageUrl && !isAllowedImageUrl(form.coverImageUrl)) {
    errors.coverImageUrl = 'URL de imagem não permitida (apenas domínios internos permitidos).';
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIO: ajustar tempo estimado via botões +/-
// FIX: opera sempre em string para manter consistência com FormState
// ─────────────────────────────────────────────────────────────────────────────
function adjustMinutes(current: string, delta: number): string {
  const parsed = parseInt(current, 10);
  const base = isNaN(parsed) ? 0 : parsed;
  const next = Math.max(1, base + delta);
  return String(next);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <div
      className="flex items-center gap-1.5 text-[12px] font-medium mt-1.5"
      style={{ color: 'var(--color-error)' }}
      role="alert"
    >
      <AlertCircle size={11} strokeWidth={2} />
      <span>{message}</span>
    </div>
  ) : null;

const SectionLabel = ({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) => (
  <label
    className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${className ?? ''}`}
    style={{ color: 'var(--color-text-faint)' }}
  >
    {children}
    {required && (
      <span className="ml-0.5" style={{ color: 'var(--color-error)' }}>
        *
      </span>
    )}
  </label>
);

// ─────────────────────────────────────────────────────────────────────────────
// INDICADOR DE PROGRESSO DO FORMULÁRIO
// ─────────────────────────────────────────────────────────────────────────────

interface FormProgress {
  filled: number;
  total: number;
  percent: number;
}

function useFormProgress(form: FormState, isEdit: boolean): FormProgress {
  const checks = [
    form.title.trim().length > 0,
    form.summary.trim().length > 0,
    form.content.trim().length > 0 && form.content !== '<p></p>',
    form.categoryId !== '',
    form.tagIds.length > 0,
    parseInt(form.estimatedTimeInMinutes, 10) >= 1,
    !isEdit || form.changeDescription.trim().length > 0,
  ];
  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  return { filled, total, percent: Math.round((filled / total) * 100) };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL — criar Categoria
// ─────────────────────────────────────────────────────────────────────────────

function CreateCategoryModal({
  categoryFlat,
  onCreated,
  onClose,
}: {
  categoryFlat: { id: string; label: string }[];
  onCreated: (cat: { id: string; label: string }) => void;
  onClose: () => void;
}) {
  const showToast = useToastStore((s) => s.showToast);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // FIX: usar onClick no lugar de onSubmit em <form> para evitar re-render
  // desnecessário e garantir compatibilidade com React strict mode
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const created = await knowledgeBaseService.categories.create({
        name: name.trim(),
        parentCategoryId: parentId || null,
      });
      showToast(`Categoria "${created.name}" criada!`, 'success');
      onCreated({ id: created.id, label: created.name });
    } catch {
      showToast('Erro ao criar categoria. Verifique se já existe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'oklch(0% 0 0 / 55%)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[400px] rounded-[16px] shadow-2xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animation: 'modal-enter 180ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <style>{`
          @keyframes modal-enter {
            from { opacity: 0; transform: translateY(-10px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-dim)' }}>
              <FolderPlus size={14} style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-[14px] font-bold" style={{ color: 'var(--color-text)' }}>Nova Categoria</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
          <div>
            <SectionLabel required>Nome da categoria</SectionLabel>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Redes, Segurança, Infraestrutura..."
              className="w-full h-[38px] px-3 text-[13px] rounded-[7px] focus:outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-surface-dim)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>
          {categoryFlat.length > 0 && (
            <div>
              <SectionLabel>Subcategoria de (opcional)</SectionLabel>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-[38px] px-3 text-[13px] rounded-[7px] focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-surface-dim)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="">Nenhuma (raiz)</option>
                {categoryFlat.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" fullWidth isLoading={loading} disabled={!name.trim() || loading}>
              <FolderPlus size={14} />
              Criar Categoria
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL — criar Tag
// ─────────────────────────────────────────────────────────────────────────────

function CreateTagModal({ onCreated, onClose }: { onCreated: (tag: Tag) => void; onClose: () => void }) {
  const showToast = useToastStore((s) => s.showToast);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const created = await knowledgeBaseService.tags.create({ name: name.trim() });
      showToast(`Tag "${created.name}" criada!`, 'success');
      onCreated(created);
    } catch {
      showToast('Erro ao criar tag. Pode já existir.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'oklch(0% 0 0 / 55%)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[360px] rounded-[16px] shadow-2xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animation: 'modal-enter 180ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-dim)' }}>
              <TagIcon size={13} style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-[14px] font-bold" style={{ color: 'var(--color-text)' }}>Nova Tag</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
          <div>
            <SectionLabel required>Nome da tag</SectionLabel>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cisco, OSPF, Firewall..."
              className="w-full h-[38px] px-3 text-[13px] rounded-[7px] focus:outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-surface-dim)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" fullWidth isLoading={loading} disabled={!name.trim() || loading}>
              <TagIcon size={13} />
              Criar Tag
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARRA DE PROGRESSO LATERAL
// ─────────────────────────────────────────────────────────────────────────────

function ProgressRing({ percent }: { percent: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  const color = percent === 100 ? 'var(--color-success, #22c55e)' : 'var(--color-accent)';
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.3s ease' }}
      />
      <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
        {percent}%
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function ArticleEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const canEdit = useHasRole('Admin', 'Manager');
  const isEdit = Boolean(id);

  // ── Estados de carregamento ────────────────────────────────────────────────
  const [isLoadingArticle, setIsLoadingArticle] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ── Formulário ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [slugPreview, setSlugPreview] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Dados auxiliares ───────────────────────────────────────────────────────
  const [categoryFlat, setCategoryFlat] = useState<{ id: string; label: string }[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // ── Modais ─────────────────────────────────────────────────────────────────
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);

  // ── Progresso ──────────────────────────────────────────────────────────────
  const progress = useFormProgress(form, isEdit);

  // ── Guard de role ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canEdit) {
      showToast('Sem permissão para aceder ao editor.', 'error');
      navigate('/base-conhecimento');
    }
  }, [canEdit, navigate, showToast]);

  // ── Aviso ao sair com alterações não salvas ────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Carregar categorias + tags ─────────────────────────────────────────────
  const loadMeta = useCallback(async () => {
    setIsLoadingMeta(true);
    try {
      const [tree, tags] = await Promise.all([
        knowledgeBaseService.categories.getTree(),
        knowledgeBaseService.tags.getAll(),
      ]);
      setCategoryFlat(flattenTree(Array.isArray(tree) ? tree : []));
      setAllTags(Array.isArray(tags) ? tags : []);
    } catch {
      showToast('Falha ao carregar categorias e tags.', 'error');
    } finally {
      setIsLoadingMeta(false);
    }
  }, [showToast]);

  // FIX: 7 — dependência do loadMeta corrigida
  useEffect(() => { loadMeta(); }, [loadMeta]);

  // ── Carregar artigo (modo edição) ──────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    const load = async () => {
      setIsLoadingArticle(true);
      setLoadError(null);
      try {
        const data: ArticleDetail = await knowledgeBaseService.articles.getById(id);
        setForm({
          title: data.title,
          summary: data.summary ?? '',
          content: data.content,
          categoryId: data.category?.id ?? (data as any).categoryId ?? '',
          tagIds: (data.tags ?? []).map((t) => t.id),
          status: data.status,
          difficulty: data.difficulty ?? DifficultyLevel.Basic,
          coverImageUrl: data.coverImageUrl ?? (data as any).imageUrl ?? (data as any).coverImage ?? '',
          // FIX: conversão explícita para string ao hidratar o formulário
          estimatedTimeInMinutes: data.estimatedTimeInMinutes != null
            ? String(data.estimatedTimeInMinutes)
            : '',
          changeDescription: '',
        });
        setSlugPreview(data.slug);
        setSlugManual(true);
        setIsDirty(false);
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? err.response?.status === 404
            ? 'Artigo não encontrado.'
            : 'Erro ao carregar o artigo.'
          : 'Erro inesperado.';
        setLoadError(msg);
      } finally {
        setIsLoadingArticle(false);
      }
    };
    load();
  }, [id, isEdit]);

  // ── Auto-slug ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slugManual) setSlugPreview(generateSlug(form.title));
  }, [form.title, slugManual]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [errors],
  );

  // FIX: 3 — Remoção da race condition recebendo status desejado diretamente
  const handleSubmit = async (e: React.FormEvent, overrideForm?: Partial<FormState>) => {
    e.preventDefault();
    const formToSubmit = { ...form, ...overrideForm };
    const validationErrors = validate(formToSubmit, isEdit);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast('Corrija os campos destacados antes de publicar.', 'error');
      // Rolar para o primeiro erro
      setTimeout(() => {
        document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setIsSaving(true);
    try {
      // FIX: conversão para number apenas no momento do envio ao backend
      const estMinutes = parseInt(form.estimatedTimeInMinutes, 10) || 1;

      if (isEdit && id) {
        const payload: UpdateKnowledgeArticleRequest = {
          id,
          title: formToSubmit.title,
          summary: formToSubmit.summary,
          content: formToSubmit.content,
          categoryId: formToSubmit.categoryId,
          tagIds: formToSubmit.tagIds,
          status: formToSubmit.status,
          difficulty: formToSubmit.difficulty,
          estimatedTimeInMinutes: estMinutes,
          coverImageUrl: formToSubmit.coverImageUrl || undefined,
          changeDescription: formToSubmit.changeDescription,
        };
        await knowledgeBaseService.articles.update(payload);
        showToast('Artigo atualizado — nova versão registada.', 'success');
        setIsDirty(false);
        navigate(`/base-conhecimento/${id}`);
      } else {
        const payload: CreateKnowledgeArticleRequest = {
          title: formToSubmit.title,
          summary: formToSubmit.summary,
          content: formToSubmit.content,
          categoryId: formToSubmit.categoryId,
          tagIds: formToSubmit.tagIds,
          status: formToSubmit.status,
          difficulty: formToSubmit.difficulty,
          estimatedTimeInMinutes: estMinutes,
          coverImageUrl: formToSubmit.coverImageUrl || undefined,
        };
        const created = await knowledgeBaseService.articles.create(payload);
        showToast('Artigo criado com sucesso!', 'success');
        setIsDirty(false);
        navigate(`/base-conhecimento/${created.id}`);
      }
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : err.response?.data?.message ?? err.response?.data?.mensagem ?? 'Erro ao guardar o artigo.'
        : 'Erro inesperado.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = (e: React.MouseEvent) => {
    if (!form.title.trim()) {
      showToast('O título é obrigatório para guardar como rascunho.', 'error');
      return;
    }
    const overrides = { status: ArticleStatus.Draft as ArticleStatusType };
    setForm((prev) => ({ ...prev, ...overrides }));
    handleSubmit(e as unknown as React.FormEvent, overrides);
  };

  const handlePublish = (e: React.MouseEvent) => {
    const overrides = {
      status: ArticleStatus.Published as ArticleStatusType,
      changeDescription: isEdit && !form.changeDescription.trim() ? 'Publicando artigo' : form.changeDescription,
    };
    setForm((prev) => ({ ...prev, ...overrides }));
    handleSubmit(e as unknown as React.FormEvent, overrides);
  };

  const handleCategoryCreated = (cat: { id: string; label: string }) => {
    setCategoryFlat((prev) => [...prev, cat]);
    set('categoryId', cat.id);
    setShowCreateCategory(false);
  };

  const handleTagCreated = (tag: Tag) => {
    setAllTags((prev) => [...prev, tag]);
    set('tagIds', [...form.tagIds, tag.id]);
    setShowCreateTag(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING / ERROR
  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoadingArticle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-faint)' }}>Carregando artigo...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 h-full text-center px-8" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-error-subtle)', color: 'var(--color-error)' }}>
          <AlertCircle size={24} />
        </div>
        <p className="text-[16px] font-bold" style={{ color: 'var(--color-text)' }}>{loadError}</p>
        <Button variant="outline" onClick={() => navigate('/base-conhecimento')}>
          <ArrowLeft size={14} /> Voltar
        </Button>
      </div>
    );
  }

  const selectedCategory = categoryFlat.find((c) => c.id === form.categoryId);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Modais ─────────────────────────────────────────────────────────── */}
      {showCreateCategory && (
        <CreateCategoryModal
          categoryFlat={categoryFlat}
          onCreated={handleCategoryCreated}
          onClose={() => setShowCreateCategory(false)}
        />
      )}
      {showCreateTag && (
        <CreateTagModal
          onCreated={handleTagCreated}
          onClose={() => setShowCreateTag(false)}
        />
      )}

      <div
        className="flex flex-col h-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            TOPBAR
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 flex items-center gap-3 px-5 border-b"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            height: '52px',
          }}
        >
          {/* Breadcrumb */}
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/base-conhecimento/${id}` : '/base-conhecimento')}
            className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors shrink-0"
            style={{ color: 'var(--color-text-faint)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
          >
            <ArrowLeft size={14} />
            {isEdit ? 'Artigo' : 'Base de Conhecimento'}
          </button>

          <ChevronRight size={13} style={{ color: 'var(--color-border)' }} />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              {form.title || (isEdit ? 'Editar Artigo' : 'Novo Artigo')}
            </span>
            {isEdit && (
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}
              >
                Edição
              </span>
            )}
            {/* Indicador de não salvo */}
            {isDirty && (
              <span
                className="shrink-0 w-2 h-2 rounded-full"
                title="Alterações não salvas"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Progresso compacto na topbar */}
            <div className="hidden sm:flex items-center gap-2 mr-1" title={`${progress.filled} de ${progress.total} campos preenchidos`}>
              <ProgressRing percent={progress.percent} />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[7px] text-[12px] font-semibold transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-dim)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)';
                  e.currentTarget.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-dim)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                <Save size={13} />
                Rascunho
              </button>
              <HelpTooltip content="Salva o artigo como rascunho. Visível apenas para Editores e Administradores." align="right" />
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                onClick={handlePublish}
                size="sm"
                disabled={isSaving || isLoadingMeta}
                isLoading={isSaving}
              >
                <Send size={13} />
                {isEdit ? 'Publicar Edição' : 'Publicar Artigo'}
              </Button>
              <HelpTooltip content="Publica o artigo imediatamente, tornando-o visível para todos os usuários." align="right" />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CORPO — Editor + Sidebar
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex overflow-hidden">
          <form
            id="kb-editor-form"
            onSubmit={handleSubmit}
            noValidate
            className={`flex-1 flex overflow-hidden transition-opacity duration-300 ${isSaving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
          >
            {/* ── COLUNA PRINCIPAL ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-10 py-10">

                {/* ── Título — estilo Confluence ───────────────────────── */}
                <div className="mb-6">
                  <textarea
                    id="kb-title"
                    value={form.title}
                    onChange={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                      set('title', e.target.value);
                    }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = t.scrollHeight + 'px';
                    }}
                    maxLength={150}
                    rows={1}
                    placeholder="Título do artigo"
                    className="w-full resize-none overflow-hidden text-[32px] font-bold leading-tight placeholder:opacity-20 focus:outline-none bg-transparent"
                    style={{
                      color: 'var(--color-text)',
                      border: 'none',
                      padding: '0',
                      minHeight: '44px',
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    {errors.title ? (
                      <FieldError message={errors.title} />
                    ) : (
                      <div
                        className="flex items-center gap-1 text-[13px] font-mono select-none"
                        style={{ color: 'var(--color-text-faint)', opacity: 0.65 }}
                      >
                        <span style={{ opacity: 0.5 }}>/base-conhecimento/</span>
                        <span style={{ color: 'var(--color-accent)' }}>
                          {slugPreview || 'slug-do-artigo'}
                        </span>
                      </div>
                    )}
                    <span
                      className="text-[11px] shrink-0 ml-4 tabular-nums"
                      style={{ color: form.title.length > 140 ? 'var(--color-error)' : 'var(--color-text-faint)' }}
                    >
                      {form.title.length}/150
                    </span>
                  </div>
                  <div className="mt-4 mb-6" style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />
                </div>

                {/* ── Resumo — RB009 ───────────────────────────────────── */}
                <div className="mb-6">
                  <SectionLabel required>Resumo</SectionLabel>
                  <p className="text-[12px] mb-2 leading-relaxed" style={{ color: 'var(--color-text-faint)' }}>
                    Descreva em 1–3 frases o que este artigo ensina. Aparece nos resultados de pesquisa e em listagens.
                  </p>
                  <textarea
                    id="kb-summary"
                    value={form.summary}
                    onChange={(e) => set('summary', e.target.value)}
                    placeholder="Ex: Este artigo explica como configurar Port Security no Cisco Catalyst para restringir acesso por MAC address..."
                    rows={2}
                    className="w-full px-3 py-2.5 text-[14px] rounded-[8px] resize-none focus:outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: `1px solid ${errors.summary ? 'var(--color-error)' : 'var(--color-border)'}`,
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) => { if (!errors.summary) e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                    onBlur={(e) => { if (!errors.summary) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  />
                  <FieldError message={errors.summary} />
                </div>

                {/* ── Editor de Conteúdo ────────────────────────────────── */}
                <div className="flex flex-col" style={{ minHeight: '75vh' }}>
                  <SectionLabel required>Conteúdo</SectionLabel>
                  <RichTextEditor
                    content={form.content}
                    onChange={(html) => set('content', html)}
                    className="flex-1"
                    style={{
                      border: errors.content
                        ? '2px solid var(--color-error)'
                        : '1px solid var(--color-border)',
                    }}
                  />
                  <FieldError message={errors.content} />
                </div>

                {/* ── Log de Auditoria — RB020 ─────────────────────────── */}
                {isEdit && (
                  <div
                    className="mt-8 p-4 rounded-[10px] border"
                    style={{
                      backgroundColor: 'var(--color-warning-subtle)',
                      borderColor: 'var(--color-warning)',
                    }}
                  >
                    <p className="text-[12px] font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-warning)' }}>
                      <CheckCircle2 size={13} />
                      Log de Auditoria
                      <span className="font-normal ml-0.5" style={{ color: 'var(--color-text-faint)' }}>— obrigatório em toda edição</span>
                    </p>
                    <p className="text-[11px] mb-2 leading-relaxed" style={{ color: 'var(--color-text-faint)' }}>
                      Descreva sucintamente o que foi alterado. Esta mensagem fica registada no histórico de versões do artigo (RB020).
                    </p>
                    <textarea
                      id="kb-change-description"
                      value={form.changeDescription}
                      onChange={(e) => set('changeDescription', e.target.value)}
                      placeholder="Ex: Corrigido o passo 3 — o comando correto é 'switchport port-security'. Adicionado exemplo de VLAN 100."
                      rows={2}
                      className="w-full px-3 py-2 text-[13px] rounded-[6px] resize-none focus:outline-none transition-all"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: `1px solid ${errors.changeDescription ? 'var(--color-error)' : 'var(--color-warning)'}`,
                        color: 'var(--color-text)',
                      }}
                      onFocus={(e) => { if (!errors.changeDescription) e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                      onBlur={(e) => { if (!errors.changeDescription) e.currentTarget.style.borderColor = errors.changeDescription ? 'var(--color-error)' : 'var(--color-warning)'; }}
                    />
                    <FieldError message={errors.changeDescription} />
                  </div>
                )}

                <div className="h-16" />
              </div>
            </div>

            {/* ── SIDEBAR DIREITA ───────────────────────────────────────── */}
            <div
              className="shrink-0 overflow-y-auto flex flex-col gap-4 px-4 pt-5 pb-6"
              style={{
                width: '284px',
                borderLeft: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
              }}
            >

              {/* Progresso detalhado */}
              <div
                className="rounded-[10px] p-3"
                style={{ backgroundColor: 'var(--color-surface-dim)', border: '1px solid var(--color-border-subtle)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
                    Completude do Artigo
                  </span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: progress.percent === 100 ? 'var(--color-success, #22c55e)' : 'var(--color-accent)' }}>
                    {progress.filled}/{progress.total}
                  </span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: '5px', backgroundColor: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress.percent}%`,
                      backgroundColor: progress.percent === 100 ? 'var(--color-success, #22c55e)' : 'var(--color-accent)',
                      transition: 'width 0.4s ease, background-color 0.3s ease',
                    }}
                  />
                </div>
                {progress.percent === 100 && (
                  <p className="text-[10px] mt-1.5 font-semibold" style={{ color: 'var(--color-success, #22c55e)' }}>
                    ✓ Pronto para publicar
                  </p>
                )}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Status */}
              <div>
                <SectionLabel required>Status</SectionLabel>
                <select
                  id="kb-status"
                  value={form.status}
                  onChange={(e) => set('status', Number(e.target.value) as ArticleStatusType)}
                  className="w-full h-[36px] px-3 text-[13px] rounded-[7px] focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-surface-dim)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {Object.entries(ARTICLE_STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--color-text-faint)' }}>
                  {form.status === ArticleStatus.Published
                    ? '✓ Ficará visível publicamente após publicar.'
                    : 'Rascunho — visível apenas para Editores e Admins.'}
                </p>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Categoria */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <SectionLabel required className="mb-0">
                    <span className="flex items-center gap-1"><Folder size={10} />Categoria</span>
                  </SectionLabel>
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(true)}
                    className="flex items-center gap-1 text-[10px] font-bold transition-opacity"
                    style={{ color: 'var(--color-accent)' }}
                    title="Criar nova categoria"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.65')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <Plus size={10} />Nova
                  </button>
                </div>

                {isLoadingMeta ? (
                  <div className="flex items-center gap-2 h-[36px]">
                    <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-text-faint)' }}>Carregando...</span>
                  </div>
                ) : categoryFlat.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(true)}
                    className="w-full flex items-center justify-center gap-2 h-[38px] rounded-[7px] text-[12px] font-semibold border border-dashed transition-colors"
                    style={{
                      borderColor: errors.categoryId ? 'var(--color-error)' : 'var(--color-border)',
                      color: errors.categoryId ? 'var(--color-error)' : 'var(--color-accent)',
                      backgroundColor: 'var(--color-surface-dim)',
                    }}
                  >
                    <FolderPlus size={13} />
                    Criar primeira categoria
                  </button>
                ) : (
                  <select
                    id="kb-category"
                    value={form.categoryId}
                    onChange={(e) => set('categoryId', e.target.value)}
                    className="w-full h-[38px] px-3 text-[13px] rounded-[7px] focus:outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-surface-dim)',
                      border: `1px solid ${errors.categoryId ? 'var(--color-error)' : 'var(--color-border)'}`,
                      color: form.categoryId ? 'var(--color-text)' : 'var(--color-text-faint)',
                    }}
                    onFocus={(e) => { if (!errors.categoryId) e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                    onBlur={(e) => { if (!errors.categoryId) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  >
                    <option value="">Selecione...</option>
                    {categoryFlat.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                )}
                <FieldError message={errors.categoryId} />
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <SectionLabel required className="mb-0">
                    <span className="flex items-center gap-1"><TagIcon size={10} />Tags</span>
                  </SectionLabel>
                  <button
                    type="button"
                    onClick={() => setShowCreateTag(true)}
                    className="flex items-center gap-1 text-[10px] font-bold transition-opacity"
                    style={{ color: 'var(--color-accent)' }}
                    title="Criar nova tag"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.65')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <Plus size={10} />Nova
                  </button>
                </div>

                {isLoadingMeta ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-text-faint)' }}>Carregando...</span>
                  </div>
                ) : allTags.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateTag(true)}
                    className="w-full flex items-center justify-center gap-2 h-[38px] rounded-[7px] text-[12px] font-semibold border border-dashed transition-colors"
                    style={{
                      borderColor: errors.tagIds ? 'var(--color-error)' : 'var(--color-border)',
                      color: errors.tagIds ? 'var(--color-error)' : 'var(--color-accent)',
                      backgroundColor: 'var(--color-surface-dim)',
                    }}
                  >
                    <TagIcon size={13} />
                    Criar primeira tag
                  </button>
                ) : (
                  <TagCombobox
                    allTags={form.categoryId
                      ? allTags.filter((t) => !t.categoryId || t.categoryId === form.categoryId)
                      : allTags}
                    selectedTagIds={form.tagIds}
                    onChange={(tagIds) => set('tagIds', tagIds)}
                    error={errors.tagIds}
                  />
                )}
                <FieldError message={errors.tagIds} />
                {form.tagIds.length > 0 && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
                    {form.tagIds.length} tag{form.tagIds.length !== 1 ? 's' : ''} selecionada{form.tagIds.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Nível de Dificuldade — RB023 */}
              <div>
                <SectionLabel required>Nível de Dificuldade</SectionLabel>
                <select
                  id="kb-difficulty"
                  value={form.difficulty}
                  onChange={(e) => set('difficulty', Number(e.target.value) as DifficultyLevelType)}
                  className="w-full h-[36px] px-3 text-[13px] rounded-[7px] focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-surface-dim)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--color-text-faint)' }}>
                  {form.difficulty === 1
                    ? 'Para operações rotineiras e simples.'
                    : form.difficulty === 2
                    ? 'Requer conhecimento prévio moderado.'
                    : 'Para especialistas — configurações complexas.'}
                </p>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Tempo estimado — RB023 */}
              <div>
                <SectionLabel required>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    Tempo Estimado (min)
                  </span>
                </SectionLabel>
                <div
                  className="flex items-center w-full h-[36px] px-3 rounded-[7px] transition-all"
                  style={{
                    backgroundColor: 'var(--color-surface-dim)',
                    border: `1px solid ${errors.estimatedTimeInMinutes ? 'var(--color-error)' : 'var(--color-border)'}`,
                  }}
                  // FIX: focus-within via inline é impossível em React sem estado;
                  // usamos a pseudo-classe nativa do CSS via className abaixo:
                  tabIndex={-1}
                >
                  {/* FIX PRINCIPAL: input type="text" + inputMode="numeric" para
                      manter FormState como string e evitar todos os erros TS.
                      O onChange trata apenas strings; a conversão para number
                      ocorre somente no handleSubmit. */}
                  <input
                    id="kb-reading-time"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="5"
                    value={form.estimatedTimeInMinutes}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      set('estimatedTimeInMinutes', raw);
                    }}
                    className="flex-1 bg-transparent focus:outline-none text-[13px]"
                    style={{ color: 'var(--color-text)' }}
                  />
                  <span className="text-[12px] mr-2 select-none" style={{ color: 'var(--color-text-muted)' }}>
                    {parseInt(form.estimatedTimeInMinutes, 10) === 1 ? 'minuto' : 'minutos'}
                  </span>
                  <div
                    className="flex flex-col border-l pl-2 h-full py-1 justify-between"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {/* FIX: botões usam adjustMinutes() — opera em string → string */}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => set('estimatedTimeInMinutes', adjustMinutes(form.estimatedTimeInMinutes, 1))}
                      className="transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    >
                      <ChevronUp size={12} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => set('estimatedTimeInMinutes', adjustMinutes(form.estimatedTimeInMinutes, -1))}
                      className="transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    >
                      <ChevronDown size={12} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                <FieldError message={errors.estimatedTimeInMinutes} />
              </div>

              {/* URL da capa */}
              <div>
                <SectionLabel>URL Imagem de Capa</SectionLabel>
                <input
                  id="kb-cover-url"
                  type="url"
                  placeholder="https://..."
                  value={form.coverImageUrl}
                  onChange={(e) => set('coverImageUrl', e.target.value)}
                  className="w-full h-[36px] px-3 text-[13px] rounded-[7px] focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--color-surface-dim)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
                {/* Preview da imagem de capa */}
                {form.coverImageUrl && (
                  <div className="mt-2 rounded-[7px] overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                    <img
                      src={form.coverImageUrl}
                      alt="Pré-visualização da capa"
                      className="w-full h-[80px] object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Pré-visualização do card */}
              {(form.title || selectedCategory) && (
                <div>
                  <SectionLabel>Pré-visualização</SectionLabel>
                  <div
                    className="rounded-[10px] p-3 border"
                    style={{ backgroundColor: 'var(--color-surface-dim)', borderColor: 'var(--color-border)' }}
                  >
                    {selectedCategory && (
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                        <Folder size={8} />
                        {selectedCategory.label.trim()}
                      </p>
                    )}
                    <p className="text-[12px] font-bold leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
                      {form.title || 'Título do artigo'}
                    </p>
                    {form.summary && (
                      <p className="text-[10px] mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {form.summary}
                      </p>
                    )}
                    {/* Metadados: dificuldade e tempo */}
                    {(form.difficulty || form.estimatedTimeInMinutes) && (
                      <div className="flex items-center gap-2 mt-2">
                        {form.difficulty && (
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: form.difficulty === 1
                                ? 'var(--color-success-subtle, #dcfce7)'
                                : form.difficulty === 2
                                ? 'var(--color-warning-subtle)'
                                : 'var(--color-error-subtle)',
                              color: form.difficulty === 1
                                ? 'var(--color-success, #16a34a)'
                                : form.difficulty === 2
                                ? 'var(--color-warning)'
                                : 'var(--color-error)',
                            }}
                          >
                            {DIFFICULTY_LABELS[form.difficulty]}
                          </span>
                        )}
                        {form.estimatedTimeInMinutes && parseInt(form.estimatedTimeInMinutes, 10) >= 1 && (
                          <span className="flex items-center gap-0.5 text-[9px]" style={{ color: 'var(--color-text-faint)' }}>
                            <Clock size={8} />
                            {form.estimatedTimeInMinutes} min
                          </span>
                        )}
                      </div>
                    )}
                    {form.tagIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.tagIds.slice(0, 4).map((tid) => {
                          const tag = allTags.find((t) => t.id === tid);
                          return tag ? (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent-text)' }}
                            >
                              <TagIcon size={7} />
                              {tag.name}
                            </span>
                          ) : null;
                        })}
                        {form.tagIds.length > 4 && (
                          <span className="text-[9px]" style={{ color: 'var(--color-text-faint)' }}>
                            +{form.tagIds.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botão principal na sidebar */}
              <div className="flex items-center gap-1.5 mt-auto pt-2">
                <div className="flex-1">
                  <Button
                    type="submit"
                    form="kb-editor-form"
                    fullWidth
                    disabled={isSaving || isLoadingMeta}
                    isLoading={isSaving}
                  >
                    <BookOpen size={14} />
                    {isEdit ? 'Guardar Nova Versão' : 'Salvar Artigo'}
                    <div className="ml-2" onClick={(e) => e.preventDefault()}>
                      <HelpTooltip
                        content="Salva o artigo com o status selecionado acima."
                        align="left"
                      />
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}