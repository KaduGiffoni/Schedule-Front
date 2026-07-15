import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Folder,
  Loader2,
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
import { InputField } from '../../../components/ui/InputField';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';
import { useToastStore } from '../../../lib/toastStore';
import { useHasRole } from '../../../lib/useHasRole';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Gera um slug URL-friendly a partir de um título PT-BR. */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '')   // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')            // Espaços → hífens
    .replace(/-+/g, '-')             // Múltiplos hífens → um
    .slice(0, 100);                  // Máximo 100 chars
}

/** Achata a árvore de categorias em lista plana para selects. */
function flattenTree(
  nodes: CategoryTreeNode[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: '  '.repeat(depth) + n.name },
    ...flattenTree(n.children, depth + 1),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS DO FORMULÁRIO
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  excerpt: string;
  content: string;
  categoryId: string;
  tagIds: string[];
  status: ArticleStatusType;
  coverImageUrl: string;
  estimatedReadingTimeMinutes: string; // string para o input, converte no submit
  changeDescription: string;           // RB020: log de auditoria (só na edição)
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

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO CLIENT-SIDE (alinhada com FluentValidation do backend)
// ─────────────────────────────────────────────────────────────────────────────

function validate(form: FormState, isEdit: boolean): FormErrors {
  const errors: FormErrors = {};

  if (!form.title.trim()) {
    errors.title = 'O título é obrigatório.'; // RB008
  } else if (form.title.length > 150) {
    errors.title = 'O título não pode ter mais de 150 caracteres.'; // RB008
  }

  if (!form.excerpt.trim()) {
    errors.excerpt = 'O resumo é obrigatório.'; // RB009
  }

  if (!form.content || form.content === '<p></p>' || form.content.trim() === '') {
    errors.content = 'O conteúdo do artigo é obrigatório.';
  }

  if (!form.categoryId) {
    errors.categoryId = 'Selecione uma categoria.'; // RB010
  }

  if (form.tagIds.length === 0) {
    errors.tagIds = 'Selecione pelo menos uma tag.'; // RB011
  }

  if (
    form.estimatedReadingTimeMinutes &&
    (isNaN(Number(form.estimatedReadingTimeMinutes)) ||
      Number(form.estimatedReadingTimeMinutes) < 1)
  ) {
    errors.estimatedReadingTimeMinutes = 'Informe um número válido de minutos (≥ 1).';
  }

  if (isEdit && form.status === ArticleStatus.Published && !form.changeDescription.trim()) {
    errors.changeDescription = 'Descreva a alteração para o log de auditoria.'; // RB020
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

// ── Inline Error Message ──────────────────────────────────────────────────────
const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <div
      className="flex items-center gap-1.5 text-[12px] font-medium mt-1"
      style={{ color: 'var(--color-error)' }}
      role="alert"
    >
      <AlertCircle size={12} strokeWidth={2} />
      <span>{message}</span>
    </div>
  ) : null;

// ── Section Label ─────────────────────────────────────────────────────────────
const SectionLabel = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label
    className="block text-[12px] font-semibold mb-1.5"
    style={{ color: 'var(--color-text-muted)' }}
  >
    {children}
    {required && (
      <span className="ml-0.5" style={{ color: 'var(--color-error)' }}>
        *
      </span>
    )}
  </label>
);

// ── Tag Chip (selecionável) ───────────────────────────────────────────────────
const TagChip = ({
  tag,
  selected,
  onClick,
}: {
  tag: Tag;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
    style={{
      backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-surface-dim)',
      color: selected ? 'white' : 'var(--color-text-muted)',
      border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
    }}
    aria-pressed={selected}
  >
    <TagIcon size={9} />
    {tag.name}
    {selected && <X size={9} />}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function ArticleEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  // RB002: apenas Admin ou Manager podem aceder ao editor.
  const canEdit = useHasRole('Admin', 'Manager');

  /** Modo: 'create' quando a rota é /base-conhecimento/novo */
  const isEdit = Boolean(id);
  const pageTitle = isEdit ? 'Editar Artigo' : 'Novo Artigo';

  // ── Estado de carregamento inicial (modo edição) ──────────────────────────
  const [isLoadingArticle, setIsLoadingArticle] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Estado do formulário ──────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [slugPreview, setSlugPreview] = useState('');
  const [slugManual, setSlugManual] = useState(false); // true após o user editar o slug manualmente

  // ── Dados de suporte (categorias e tags) ──────────────────────────────────
  const [categoryFlat, setCategoryFlat] = useState<{ id: string; label: string }[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // ── Guarda de role ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canEdit) {
      showToast('Sem permissão para aceder ao editor.', 'error');
      navigate('/base-conhecimento');
    }
  }, [canEdit, navigate, showToast]);

  // ── Carregar categorias + tags ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar artigo existente (modo edição) ────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;

    const load = async () => {
      setIsLoadingArticle(true);
      setLoadError(null);
      try {
        const data: ArticleDetail = await knowledgeBaseService.articles.getById(id);
        setForm({
          title:                      data.title,
          excerpt:                    data.excerpt ?? '',
          content:                    data.content,
          categoryId:                 data.category?.id ?? '',
          tagIds:                     data.tags.map((t) => t.id),
          status:                     data.status,
          coverImageUrl:              data.coverImageUrl ?? '',
          estimatedReadingTimeMinutes:
            data.estimatedReadingTimeMinutes?.toString() ?? '',
          changeDescription: '',
        });
        setSlugPreview(data.slug);
        setSlugManual(true); // Slug já existe — não sobrescrever
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.status === 404
              ? 'Artigo não encontrado.'
              : 'Erro ao carregar o artigo.')
          : 'Erro inesperado.';
        setLoadError(msg);
      } finally {
        setIsLoadingArticle(false);
      }
    };

    load();
  }, [id, isEdit]);

  // ── Auto-slug a partir do título ───────────────────────────────────────────
  useEffect(() => {
    if (!slugManual) {
      setSlugPreview(generateSlug(form.title));
    }
  }, [form.title, slugManual]);

  // ── Handlers do form ───────────────────────────────────────────────────────
  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      // Limpa o erro do campo ao editar
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [errors],
  );

  const handleTagToggle = (tagId: string) => {
    set(
      'tagIds',
      form.tagIds.includes(tagId)
        ? form.tagIds.filter((t) => t !== tagId)
        : [...form.tagIds, tagId],
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(form, isEdit);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast('Corrija os erros antes de guardar.', 'error');
      // Scroll para o primeiro erro
      document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && id) {
        // ── Modo edição: PUT sem {id} na rota — id vai no body (RB004) ───────
        const payload: UpdateKnowledgeArticleRequest = {
          id,
          title:                      form.title,
          excerpt:                    form.excerpt,
          content:                    form.content,
          categoryId:                 form.categoryId,
          tagIds:                     form.tagIds,
          status:                     form.status,
          estimatedReadingTimeMinutes:
            form.estimatedReadingTimeMinutes
              ? Number(form.estimatedReadingTimeMinutes)
              : undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          changeDescription: form.changeDescription || undefined, // RB020
        };
        await knowledgeBaseService.articles.update(payload);
        showToast('Artigo atualizado com sucesso! Nova versão criada.', 'success');
        navigate(`/base-conhecimento/${id}`);
      } else {
        // ── Modo criação: POST ────────────────────────────────────────────────
        const payload: CreateKnowledgeArticleRequest = {
          title:                      form.title,
          excerpt:                    form.excerpt,
          content:                    form.content,
          categoryId:                 form.categoryId,
          tagIds:                     form.tagIds,
          status:                     form.status,
          estimatedReadingTimeMinutes:
            form.estimatedReadingTimeMinutes
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
        ? (err.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(' ')
            : err.response?.data?.message ??
              err.response?.data?.mensagem ??
              'Erro ao guardar o artigo.')
        : 'Erro inesperado.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Guardar como rascunho ─────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!form.title.trim()) {
      showToast('O título é obrigatório para guardar como rascunho.', 'error');
      return;
    }
    set('status', ArticleStatus.Draft);
    // Aguarda o setState propagar antes de submeter
    setTimeout(() => {
      document.getElementById('kb-editor-form')?.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    }, 0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING / ERROR
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoadingArticle) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 h-full"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-[14px] text-[var(--color-text-faint)] font-medium">
          Carregando artigo para edição...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 h-full text-center px-8"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
        >
          <AlertCircle size={24} />
        </div>
        <p className="text-[16px] font-bold text-[var(--color-text)]">{loadError}</p>
        <Button variant="outline" onClick={() => navigate('/base-conhecimento')}>
          <ArrowLeft size={14} /> Voltar
        </Button>
      </div>
    );
  }

  const selectClass =
    'w-full h-[40px] px-3 text-[14px] rounded-[6px] focus:outline-none transition-colors';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          TOPBAR FIXA
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex items-center gap-4 px-6 py-3.5 border-b border-[var(--color-border)] shrink-0"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <button
          type="button"
          onClick={() => navigate(isEdit ? `/base-conhecimento/${id}` : '/base-conhecimento')}
          className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
          style={{ color: 'var(--color-text-faint)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
        >
          <ArrowLeft size={15} />
          {isEdit ? 'Voltar ao Artigo' : 'Base de Conhecimento'}
        </button>

        <span style={{ color: 'var(--color-border)' }}>/</span>

        <div className="flex items-center gap-2 flex-1">
          <FileText size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[15px] font-bold text-[var(--color-text)]">{pageTitle}</span>
          {isEdit && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}
            >
              Edição — Nova Versão
            </span>
          )}
        </div>

        {/* Ações do topo */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            <Save size={14} />
            Rascunho
          </Button>
          <Button
            type="submit"
            form="kb-editor-form"
            size="sm"
            disabled={isSaving || isLoadingMeta}
            isLoading={isSaving}
          >
            <Send size={14} />
            {isEdit ? 'Publicar Edição' : 'Publicar Artigo'}
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FORMULÁRIO
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto">
        <form
          id="kb-editor-form"
          onSubmit={handleSubmit}
          className="max-w-[1100px] mx-auto px-6 py-8 flex gap-8"
          noValidate
        >
          {/* ── COLUNA PRINCIPAL ──────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">

            {/* Título */}
            <div>
              <InputField
                id="kb-title"
                label="Título do Artigo *"
                placeholder="Ex: Configuração de VLANs em Switches Cisco Catalyst"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                maxLength={150}
                error={errors.title}
              />
              <div className="flex justify-between mt-0.5">
                <span />
                <span
                  className="text-[11px]"
                  style={{
                    color:
                      form.title.length > 140
                        ? 'var(--color-error)'
                        : 'var(--color-text-faint)',
                  }}
                >
                  {form.title.length}/150
                </span>
              </div>
            </div>

            {/* Slug preview (somente leitura) */}
            <div>
              <SectionLabel>URL do Artigo (gerado automaticamente)</SectionLabel>
              <div
                className="flex items-center gap-2 h-[36px] px-3 rounded-[6px] text-[12px] font-mono"
                style={{
                  backgroundColor: 'var(--color-surface-dim)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-faint)',
                }}
              >
                <span style={{ color: 'var(--color-text-faint)', opacity: 0.6 }}>
                  /base-conhecimento/
                </span>
                <span style={{ color: 'var(--color-accent)' }}>
                  {slugPreview || 'slug-do-artigo'}
                </span>
              </div>
            </div>

            {/* Resumo / Excerpt */}
            <div>
              <SectionLabel required>Resumo (Excerpt)</SectionLabel>
              <textarea
                id="kb-excerpt"
                value={form.excerpt}
                onChange={(e) => {
                  set('excerpt', e.target.value);
                }}
                placeholder="Descreva em 1-3 frases o que o artigo ensina. Aparece nos cards de pesquisa."
                rows={3}
                className="w-full px-3 py-2 text-[14px] rounded-[6px] resize-none"
                style={{
                  backgroundColor: 'var(--color-surface-dim)',
                  border: `1px solid ${errors.excerpt ? 'var(--color-error)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                  outline: 'none',
                  transition: 'border-color 150ms ease-out',
                }}
                onFocus={(e) => {
                  if (!errors.excerpt)
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                }}
                onBlur={(e) => {
                  if (!errors.excerpt)
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              />
              <FieldError message={errors.excerpt} />
            </div>

            {/* ── Editor de Conteúdo (TipTap) ──────────────────────────────── */}
            <div>
              <SectionLabel required>Conteúdo do Artigo</SectionLabel>
              <div
                style={{
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: errors.content
                    ? '1px solid var(--color-error)'
                    : '1px solid transparent',
                }}
              >
                <RichTextEditor
                  content={form.content}
                  onChange={(html) => {
                    set('content', html);
                  }}
                />
              </div>
              <FieldError message={errors.content} />
            </div>

            {/* ── Descrição da Alteração (apenas modo edição — RB020) ───────── */}
            {isEdit && (
              <div
                className="p-4 rounded-[10px] border"
                style={{
                  backgroundColor: 'var(--color-warning-subtle)',
                  borderColor: 'var(--color-warning)',
                }}
              >
                <p className="text-[12px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-warning)' }}>
                  <CheckCircle2 size={13} />
                  Log de Auditoria Obrigatório (RB020)
                </p>
                <SectionLabel required>Descrição da Alteração</SectionLabel>
                <textarea
                  id="kb-change-description"
                  value={form.changeDescription}
                  onChange={(e) => set('changeDescription', e.target.value)}
                  placeholder="Ex: Adicionado passo 5 com configuração de VLAN 100 no switch S1. Corrigido comando show interfaces."
                  rows={2}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] resize-none"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: `1px solid ${errors.changeDescription ? 'var(--color-error)' : 'var(--color-warning)'}`,
                    color: 'var(--color-text)',
                    outline: 'none',
                  }}
                />
                <FieldError message={errors.changeDescription} />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-faint)' }}>
                  Esta descrição ficará gravada no histórico de versões do artigo.
                </p>
              </div>
            )}
          </div>

          {/* ── SIDEBAR DIREITA — Metadados ───────────────────────────────── */}
          <div className="w-[300px] shrink-0 flex flex-col gap-5">

            {/* Card de configurações */}
            <div
              className="rounded-[12px] border overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-surface-dim)' }}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-faint)' }}>
                  Configurações
                </p>
              </div>

              <div className="flex flex-col gap-5 p-4">

                {/* Status */}
                <div>
                  <SectionLabel required>Status de Publicação</SectionLabel>
                  <select
                    id="kb-status"
                    className={selectClass}
                    value={form.status}
                    onChange={(e) => set('status', Number(e.target.value) as ArticleStatusType)}
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
                  {form.status === ArticleStatus.Published && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-success)' }}>
                      Artigo ficará visível publicamente.
                    </p>
                  )}
                  {form.status === ArticleStatus.Draft && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
                      Rascunho — visível apenas para Editores e Admins.
                    </p>
                  )}
                </div>

                {/* Categoria (RB010) */}
                <div>
                  <SectionLabel required>
                    <span className="flex items-center gap-1">
                      <Folder size={11} />
                      Categoria
                    </span>
                  </SectionLabel>
                  {isLoadingMeta ? (
                    <div className="flex items-center gap-2 h-[40px]">
                      <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                      <span className="text-[12px]" style={{ color: 'var(--color-text-faint)' }}>
                        Carregando...
                      </span>
                    </div>
                  ) : (
                    <select
                      id="kb-category"
                      className={selectClass}
                      value={form.categoryId}
                      onChange={(e) => set('categoryId', e.target.value)}
                      style={{
                        backgroundColor: 'var(--color-surface-dim)',
                        border: `1px solid ${errors.categoryId ? 'var(--color-error)' : 'var(--color-border)'}`,
                        color: 'var(--color-text)',
                      }}
                    >
                      <option value="">Selecione uma categoria...</option>
                      {categoryFlat.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <FieldError message={errors.categoryId} />
                </div>

                {/* Tempo estimado de leitura */}
                <div>
                  <SectionLabel>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Tempo de Leitura (min)
                    </span>
                  </SectionLabel>
                  <InputField
                    id="kb-reading-time"
                    label=""
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Ex: 8"
                    value={form.estimatedReadingTimeMinutes}
                    onChange={(e) => set('estimatedReadingTimeMinutes', e.target.value)}
                    error={errors.estimatedReadingTimeMinutes}
                    hint="Estimativa em minutos para o leitor concluir."
                  />
                </div>

                {/* URL da capa (opcional) */}
                <div>
                  <InputField
                    id="kb-cover-url"
                    label="URL da Imagem de Capa (opcional)"
                    type="url"
                    placeholder="https://..."
                    value={form.coverImageUrl}
                    onChange={(e) => set('coverImageUrl', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Tags (RB011: mínimo 1) ────────────────────────────────────── */}
            <div
              className="rounded-[12px] border overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: errors.tagIds ? 'var(--color-error)' : 'var(--color-border)' }}
            >
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-surface-dim)' }}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-faint)' }}>
                  <TagIcon size={11} />
                  Tags *
                </p>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: form.tagIds.length > 0 ? 'var(--color-accent)' : 'var(--color-surface-dim)',
                    color: form.tagIds.length > 0 ? 'white' : 'var(--color-text-faint)',
                  }}
                >
                  {form.tagIds.length} selecionada{form.tagIds.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="p-4">
                {isLoadingMeta ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-text-faint)' }}>
                      Carregando tags...
                    </span>
                  </div>
                ) : allTags.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--color-text-faint)' }}>
                    Nenhuma tag cadastrada.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <TagChip
                        key={tag.id}
                        tag={tag}
                        selected={form.tagIds.includes(tag.id)}
                        onClick={() => handleTagToggle(tag.id)}
                      />
                    ))}
                  </div>
                )}
                <FieldError message={errors.tagIds} />
              </div>
            </div>

            {/* ── Preview de informações ─────────────────────────────────────── */}
            {(form.title || form.categoryId) && (
              <div
                className="rounded-[12px] border p-4"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-faint)' }}>
                  Pré-visualização do Card
                </p>
                <div
                  className="rounded-[10px] border p-3"
                  style={{ backgroundColor: 'var(--color-surface-dim)', borderColor: 'var(--color-border)' }}
                >
                  {form.categoryId && (
                    <p className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                      <Folder size={9} />
                      {categoryFlat.find((c) => c.id === form.categoryId)?.label ?? ''}
                    </p>
                  )}
                  <p className="text-[13px] font-bold text-[var(--color-text)] leading-snug line-clamp-2">
                    {form.title || 'Título do artigo'}
                  </p>
                  {form.excerpt && (
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                      {form.excerpt}
                    </p>
                  )}
                  {form.tagIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.tagIds.slice(0, 3).map((tid) => {
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Botão de ação principal (duplicado no rodapé para acessibilidade) */}
            <Button
              type="submit"
              form="kb-editor-form"
              fullWidth
              disabled={isSaving || isLoadingMeta}
              isLoading={isSaving}
            >
              <BookOpen size={15} />
              {isEdit ? 'Guardar Nova Versão' : 'Criar Artigo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
