import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
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
  type ArticleStatusType,
  type ArticleDetail,
  type CategoryTreeNode,
  type Tag,
  type CreateKnowledgeArticleRequest,
  type UpdateKnowledgeArticleRequest,
} from '../types';
import { Button } from '../../../components/ui/Button';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';
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
  excerpt: string;
  content: string;
  categoryId: string;
  tagIds: string[];
  status: ArticleStatusType;
  coverImageUrl: string;
  estimatedReadingTimeMinutes: string;
  changeDescription: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  title: '',
  excerpt: '',
  content: '',
  categoryId: '',
  tagIds: [],
  status: ArticleStatus.Draft,
  coverImageUrl: '',
  estimatedReadingTimeMinutes: '',
  changeDescription: '',
};

function validate(form: FormState, isEdit: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'O título é obrigatório.';
  else if (form.title.length > 150) errors.title = 'Máximo 150 caracteres.';
  if (!form.excerpt.trim()) errors.excerpt = 'O resumo é obrigatório.';
  if (!form.content || form.content === '<p></p>' || !form.content.trim())
    errors.content = 'O conteúdo é obrigatório.';
  if (!form.categoryId) errors.categoryId = 'Selecione uma categoria.';
  if (form.tagIds.length === 0) errors.tagIds = 'Selecione pelo menos uma tag.';
  if (
    form.estimatedReadingTimeMinutes &&
    (isNaN(Number(form.estimatedReadingTimeMinutes)) ||
      Number(form.estimatedReadingTimeMinutes) < 1)
  )
    errors.estimatedReadingTimeMinutes = 'Informe um número válido (≥ 1).';
  if (isEdit && form.status === ArticleStatus.Published && !form.changeDescription.trim())
    errors.changeDescription = 'Descreva a alteração para o log de auditoria.';
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <div
      className="flex items-center gap-1.5 text-[12px] font-medium mt-1"
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
// INLINE MODAL — criar Categoria
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      style={{ backgroundColor: 'oklch(0% 0 0 / 50%)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[400px] rounded-[14px] shadow-2xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animation: 'modal-enter 200ms var(--ease-out-expo) both',
        }}
      >
        <style>{`
          @keyframes modal-enter {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-dim)' }}
            >
              <FolderPlus size={14} style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-[14px] font-bold" style={{ color: 'var(--color-text)' }}>
              Nova Categoria
            </p>
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

        {/* Body */}
        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
          <div>
            <SectionLabel required>Nome da categoria</SectionLabel>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Redes, Segurança, Infraestrutura..."
              className="w-full h-[38px] px-3 text-[13px] rounded-[7px] focus:outline-none transition-colors"
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
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
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
// INLINE MODAL — criar Tag
// ─────────────────────────────────────────────────────────────────────────────

function CreateTagModal({
  onCreated,
  onClose,
}: {
  onCreated: (tag: Tag) => void;
  onClose: () => void;
}) {
  const showToast = useToastStore((s) => s.showToast);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      style={{ backgroundColor: 'oklch(0% 0 0 / 50%)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[360px] rounded-[14px] shadow-2xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animation: 'modal-enter 200ms var(--ease-out-expo) both',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-dim)' }}
            >
              <TagIcon size={13} style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-[14px] font-bold" style={{ color: 'var(--color-text)' }}>
              Nova Tag
            </p>
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

        {/* Body */}
        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
          <div>
            <SectionLabel required>Nome da tag</SectionLabel>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cisco, OSPF, Firewall..."
              className="w-full h-[38px] px-3 text-[13px] rounded-[7px] focus:outline-none transition-colors"
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
            <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
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
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function ArticleEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const canEdit = useHasRole('Admin', 'Manager');

  const isEdit = Boolean(id);

  // ── Loading states ──────────────────────────────────────────────────────────
  const [isLoadingArticle, setIsLoadingArticle] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ── Form ────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [slugPreview, setSlugPreview] = useState('');
  const [slugManual, setSlugManual] = useState(false);

  // ── Meta data ───────────────────────────────────────────────────────────────
  const [categoryFlat, setCategoryFlat] = useState<{ id: string; label: string }[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);

  // ── Guard de role ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canEdit) {
      showToast('Sem permissão para aceder ao editor.', 'error');
      navigate('/base-conhecimento');
    }
  }, [canEdit, navigate, showToast]);

  // ── Carregar categorias + tags ──────────────────────────────────────────────
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

  useEffect(() => {
    loadMeta();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar artigo (modo edição) ───────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    const load = async () => {
      setIsLoadingArticle(true);
      setLoadError(null);
      try {
        const data: ArticleDetail = await knowledgeBaseService.articles.getById(id);
        setForm({
          title: data.title,
          excerpt: data.excerpt ?? '',
          content: data.content,
          categoryId: data.category?.id ?? '',
          tagIds: (data.tags ?? []).map((t) => t.id),
          status: data.status,
          coverImageUrl: data.coverImageUrl ?? '',
          estimatedReadingTimeMinutes: data.estimatedReadingTimeMinutes?.toString() ?? '',
          changeDescription: '',
        });
        setSlugPreview(data.slug);
        setSlugManual(true);
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

  // ── Auto-slug ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slugManual) setSlugPreview(generateSlug(form.title));
  }, [form.title, slugManual]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [errors],
  );

  const toggleTag = (tagId: string) =>
    set('tagIds', form.tagIds.includes(tagId) ? form.tagIds.filter((t) => t !== tagId) : [...form.tagIds, tagId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form, isEdit);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast('Corrija os erros antes de guardar.', 'error');
      document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsSaving(true);
    try {
      if (isEdit && id) {
        const payload: UpdateKnowledgeArticleRequest = {
          id,
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          categoryId: form.categoryId,
          tagIds: form.tagIds,
          status: form.status,
          estimatedReadingTimeMinutes: form.estimatedReadingTimeMinutes
            ? Number(form.estimatedReadingTimeMinutes)
            : undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          changeDescription: form.changeDescription || undefined,
        };
        await knowledgeBaseService.articles.update(payload);
        showToast('Artigo atualizado! Nova versão criada.', 'success');
        navigate(`/base-conhecimento/${id}`);
      } else {
        const payload: CreateKnowledgeArticleRequest = {
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          categoryId: form.categoryId,
          tagIds: form.tagIds,
          status: form.status,
          estimatedReadingTimeMinutes: form.estimatedReadingTimeMinutes
            ? Number(form.estimatedReadingTimeMinutes)
            : undefined,
          coverImageUrl: form.coverImageUrl || undefined,
        };
        const created = await knowledgeBaseService.articles.create(payload);
        showToast('Artigo criado com sucesso!', 'success');
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

  const handleSaveDraft = () => {
    if (!form.title.trim()) {
      showToast('O título é obrigatório para guardar como rascunho.', 'error');
      return;
    }
    setForm((prev) => ({ ...prev, status: ArticleStatus.Draft }));
    setTimeout(() => {
      document
        .getElementById('kb-editor-form')
        ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 0);
  };

  // ── Categoria criada inline ──────────────────────────────────────────────────
  const handleCategoryCreated = (cat: { id: string; label: string }) => {
    setCategoryFlat((prev) => [...prev, cat]);
    set('categoryId', cat.id);
    setShowCreateCategory(false);
  };

  // ── Tag criada inline ────────────────────────────────────────────────────────
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
        <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-faint)' }}>
          Carregando artigo...
        </p>
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
      {/* ── Modais inline ──────────────────────────────────────────────────── */}
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
            TOPBAR — estilo Confluence
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 flex items-center gap-3 px-5 py-0 border-b"
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
            <span
              className="text-[13px] font-semibold truncate"
              style={{ color: 'var(--color-text)' }}
            >
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
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 shrink-0">
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
            <Button
              type="submit"
              form="kb-editor-form"
              size="sm"
              disabled={isSaving || isLoadingMeta}
              isLoading={isSaving}
            >
              <Send size={13} />
              {isEdit ? 'Publicar Edição' : 'Publicar Artigo'}
            </Button>
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
            className="flex-1 flex overflow-hidden"
          >

            {/* ── COLUNA PRINCIPAL ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-[820px] mx-auto px-10 py-10">

                {/* Título — estilo Confluence: grande, limpo */}
                <div className="mb-6">
                  <textarea
                    id="kb-title"
                    value={form.title}
                    onChange={(e) => {
                      // Auto-resize
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
                    className="w-full resize-none overflow-hidden text-[32px] font-bold leading-tight placeholder:text-[var(--color-border)] focus:outline-none bg-transparent"
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
                        className="flex items-center gap-1.5 text-[11px] font-mono"
                        style={{ color: 'var(--color-text-faint)', opacity: 0.7 }}
                      >
                        <span style={{ opacity: 0.5 }}>/base-conhecimento/</span>
                        <span style={{ color: 'var(--color-accent)' }}>
                          {slugPreview || 'slug-do-artigo'}
                        </span>
                      </div>
                    )}
                    <span
                      className="text-[11px] shrink-0 ml-4"
                      style={{ color: form.title.length > 140 ? 'var(--color-error)' : 'var(--color-text-faint)' }}
                    >
                      {form.title.length}/150
                    </span>
                  </div>
                  {/* Linha divisória Confluence */}
                  <div className="mt-4 mb-6" style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />
                </div>

                {/* Resumo */}
                <div className="mb-6">
                  <SectionLabel required>Resumo</SectionLabel>
                  <textarea
                    id="kb-excerpt"
                    value={form.excerpt}
                    onChange={(e) => set('excerpt', e.target.value)}
                    placeholder="Descreva em 1-3 frases o que este artigo ensina. Aparece nos resultados de pesquisa."
                    rows={2}
                    className="w-full px-3 py-2.5 text-[14px] rounded-[8px] resize-none focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: `1px solid ${errors.excerpt ? 'var(--color-error)' : 'var(--color-border)'}`,
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) => {
                      if (!errors.excerpt) e.currentTarget.style.borderColor = 'var(--color-accent)';
                    }}
                    onBlur={(e) => {
                      if (!errors.excerpt) e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  />
                  <FieldError message={errors.excerpt} />
                </div>

                {/* ── Editor de Conteúdo ────────────────────────────────── */}
                <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 360px)' }}>
                  <SectionLabel required>Conteúdo</SectionLabel>
                  <div
                    className="flex-1"
                    style={{
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: errors.content ? '2px solid var(--color-error)' : '1px solid var(--color-border)',
                    }}
                  >
                    <RichTextEditor
                      content={form.content}
                      onChange={(html) => set('content', html)}
                    />
                  </div>
                  <FieldError message={errors.content} />
                </div>

                {/* ── Log de auditoria (modo edição) ───────────────────── */}
                {isEdit && (
                  <div
                    className="mt-8 p-4 rounded-[10px] border"
                    style={{ backgroundColor: 'var(--color-warning-subtle)', borderColor: 'var(--color-warning)' }}
                  >
                    <p className="text-[12px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-warning)' }}>
                      <CheckCircle2 size={13} />
                      Log de Auditoria (obrigatório ao publicar)
                    </p>
                    <textarea
                      id="kb-change-description"
                      value={form.changeDescription}
                      onChange={(e) => set('changeDescription', e.target.value)}
                      placeholder="Ex: Corrigido o passo 3. Adicionado exemplo de configuração de VLAN 100."
                      rows={2}
                      className="w-full px-3 py-2 text-[13px] rounded-[6px] resize-none focus:outline-none"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: `1px solid ${errors.changeDescription ? 'var(--color-error)' : 'var(--color-warning)'}`,
                        color: 'var(--color-text)',
                      }}
                    />
                    <FieldError message={errors.changeDescription} />
                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-faint)' }}>
                      Esta descrição fica registada no histórico de versões.
                    </p>
                  </div>
                )}

                {/* Padding de fundo */}
                <div className="h-16" />
              </div>
            </div>

            {/* ── SIDEBAR DIREITA ───────────────────────────────────────── */}
            <div
              className="shrink-0 overflow-y-auto flex flex-col gap-4 p-4"
              style={{
                width: '280px',
                borderLeft: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
              }}
            >

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
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--color-text-faint)' }}>
                  {form.status === ArticleStatus.Published
                    ? '✓ Ficará visível publicamente.'
                    : 'Rascunho — só Editores/Admins.'}
                </p>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Categoria */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <SectionLabel required className="mb-0">
                    <span className="flex items-center gap-1">
                      <Folder size={10} />
                      Categoria
                    </span>
                  </SectionLabel>
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(true)}
                    className="flex items-center gap-1 text-[10px] font-bold transition-colors"
                    style={{ color: 'var(--color-accent)' }}
                    title="Criar nova categoria"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <Plus size={10} />
                    Nova
                  </button>
                </div>

                {isLoadingMeta ? (
                  <div className="flex items-center gap-2 h-[36px]">
                    <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-text-faint)' }}>
                      Carregando...
                    </span>
                  </div>
                ) : categoryFlat.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(true)}
                    className="w-full flex items-center justify-center gap-2 h-[36px] rounded-[7px] text-[12px] font-semibold border border-dashed transition-colors"
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
                    className="w-full h-[36px] px-3 text-[13px] rounded-[7px] focus:outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-surface-dim)',
                      border: `1px solid ${errors.categoryId ? 'var(--color-error)' : 'var(--color-border)'}`,
                      color: form.categoryId ? 'var(--color-text)' : 'var(--color-text-faint)',
                    }}
                  >
                    <option value="">Selecione...</option>
                    {categoryFlat.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
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
                    <span className="flex items-center gap-1">
                      <TagIcon size={10} />
                      Tags
                    </span>
                  </SectionLabel>
                  <button
                    type="button"
                    onClick={() => setShowCreateTag(true)}
                    className="flex items-center gap-1 text-[10px] font-bold transition-colors"
                    style={{ color: 'var(--color-accent)' }}
                    title="Criar nova tag"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <Plus size={10} />
                    Nova
                  </button>
                </div>

                {isLoadingMeta ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-text-faint)' }}>
                      Carregando...
                    </span>
                  </div>
                ) : allTags.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateTag(true)}
                    className="w-full flex items-center justify-center gap-2 h-[36px] rounded-[7px] text-[12px] font-semibold border border-dashed transition-colors"
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
                  <div
                    className="flex flex-wrap gap-1.5"
                    style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      padding: '2px',
                    }}
                  >
                    {allTags.map((tag) => {
                      const selected = form.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          aria-pressed={selected}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all"
                          style={{
                            backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-surface-dim)',
                            color: selected ? 'white' : 'var(--color-text-muted)',
                            border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          }}
                        >
                          <TagIcon size={8} />
                          {tag.name}
                          {selected && <X size={8} />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <FieldError message={errors.tagIds} />
                {form.tagIds.length > 0 && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
                    {form.tagIds.length} tag{form.tagIds.length !== 1 ? 's' : ''} selecionada{form.tagIds.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Tempo de leitura */}
              <div>
                <SectionLabel>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    Tempo de Leitura (min)
                  </span>
                </SectionLabel>
                <input
                  id="kb-reading-time"
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Ex: 5"
                  value={form.estimatedReadingTimeMinutes}
                  onChange={(e) => set('estimatedReadingTimeMinutes', e.target.value)}
                  className="w-full h-[36px] px-3 text-[13px] rounded-[7px] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface-dim)',
                    border: `1px solid ${errors.estimatedReadingTimeMinutes ? 'var(--color-error)' : 'var(--color-border)'}`,
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = errors.estimatedReadingTimeMinutes ? 'var(--color-error)' : 'var(--color-border)')}
                />
                <FieldError message={errors.estimatedReadingTimeMinutes} />
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
                  className="w-full h-[36px] px-3 text-[13px] rounded-[7px] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface-dim)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)' }} />

              {/* Preview do card (se há dados suficientes) */}
              {(form.title || selectedCategory) && (
                <div>
                  <SectionLabel>Pré-visualização</SectionLabel>
                  <div
                    className="rounded-[8px] p-3 border"
                    style={{ backgroundColor: 'var(--color-surface-dim)', borderColor: 'var(--color-border)' }}
                  >
                    {selectedCategory && (
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                        <Folder size={8} />
                        {selectedCategory.label}
                      </p>
                    )}
                    <p className="text-[12px] font-bold leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
                      {form.title || 'Título do artigo'}
                    </p>
                    {form.excerpt && (
                      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                        {form.excerpt}
                      </p>
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
              <Button
                type="submit"
                form="kb-editor-form"
                fullWidth
                disabled={isSaving || isLoadingMeta}
                isLoading={isSaving}
              >
                <BookOpen size={14} />
                {isEdit ? 'Guardar Nova Versão' : 'Criar Artigo'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
