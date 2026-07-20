import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Folder,
  Heart,
  Loader2,
  Pencil,
  Share2,
  Tag as TagIcon,
  Trophy,
  User,
  AlertCircle,
} from 'lucide-react';

import { knowledgeBaseService } from '../api/knowledgeBaseService';
import {
  ArticleStatus,
  ARTICLE_STATUS_LABELS,
  DIFFICULTY_LABELS,
  type DifficultyLevelType,
  type ArticleDetail,
  type ArticleSummary,
} from '../types';
import { Button } from '../../../components/ui/Button';
import { useToastStore } from '../../../lib/toastStore';
import { useHasRole } from '../../../lib/useHasRole';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// PROCESS TERMINAL CONTENT
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Transforma o HTML estático de blocos terminais:
 * envolve cada linha do <code class="kb-terminal-code"> em
 * <span class="kb-terminal-line"> para que o CSS ::before
 * injete automaticamente o prefixo "> " em cada linha.
 *
 * Esta função é necessária porque o TerminalCodeBlock é um
 * React Node View que só existe no editor; na visualização
 * estática o conteúdo é HTML puro (dangerouslySetInnerHTML).
 */
function processTerminalContent(html: string): string {
  if (!html) return html;

  return html.replace(
    /(<code[^>]*\bkb-terminal-code\b[^>]*>)([\s\S]*?)(<\/code>)/g,
    (_, open: string, content: string, close: string) => {
      const lines = content.split('\n');
      // Remove trailing empty line to avoid spurious ">"
      if (lines[lines.length - 1] === '') lines.pop();
      const wrapped = lines
        .map((line) => `<span class="kb-terminal-line">${line}</span>`)
        .join('\n');
      return `${open}${wrapped}${close}`;
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: number }) => {
  const cfg: Record<number, { label: string; cls: string }> = {
    [ArticleStatus.Draft]:     { label: ARTICLE_STATUS_LABELS[1], cls: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)]' },
    [ArticleStatus.Published]: { label: ARTICLE_STATUS_LABELS[2], cls: 'bg-[var(--color-success-subtle)] text-[var(--color-success)]' },
    [ArticleStatus.Archived]:  { label: ARTICLE_STATUS_LABELS[3], cls: 'bg-[var(--color-surface-dim)] text-[var(--color-text-faint)]' },
  };
  const c = cfg[status] ?? cfg[ArticleStatus.Draft];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>
      {c.label}
    </span>
  );
};

// ── Related Article Card (mini) ───────────────────────────────────────────────
const RelatedCard = ({
  article,
  onOpen,
}: {
  article: ArticleSummary;
  onOpen: (id: string) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onOpen(article.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex gap-3 p-3 rounded-[10px] border transition-all"
      style={{
        backgroundColor: hovered ? 'var(--color-surface-raised)' : 'var(--color-surface-dim)',
        borderColor: hovered ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
      aria-label={`Ver artigo relacionado: ${article.title}`}
    >
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent-text)' }}
      >
        <BookOpen size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--color-text)] leading-snug line-clamp-2">
          {article.title}
        </p>
        {/* RB023: campo \"estimatedTimeInMinutes\" do backend */}
        {article.estimatedTimeInMinutes && (
          <p className="text-[11px] text-[var(--color-text-faint)] flex items-center gap-1 mt-0.5">
            <Clock size={10} />
            {article.estimatedTimeInMinutes}min de leitura
          </p>
        )}
      </div>
      {article.isRead && (
        <CheckCircle2 size={14} className="shrink-0 self-center" style={{ color: 'var(--color-success)' }} />
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function ArticleViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  // RB002/RB003: botão Editar só aparece para Admin ou Manager
  const canEdit = useHasRole('Admin', 'Manager');

  // ── Estado do artigo ──────────────────────────────────────────────────────
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Estado das interações (optimistic updates) ────────────────────────────
  const [isFavorited, setIsFavorited] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isFavLoading, setIsFavLoading] = useState(false);
  const [isReadLoading, setIsReadLoading] = useState(false);

  // Ref para o div do conteúdo do artigo (usado para injetar botões copiar)
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Carregar artigo e registar visualização (RB015, RB024) ────────────────
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await knowledgeBaseService.articles.getById(id);
        setArticle(data);
        setIsFavorited(data.isFavorited);
        setIsRead(data.isRead);
        setViewCount(data.viewCount);
        setFavoriteCount(data.favoriteCount ?? 0);

        // RB015 + RB024: Regista visualização silenciosamente (não bloqueia UI)
        knowledgeBaseService.interactions
          .registerView(id)
          .then(() => setViewCount((c) => c + 1))
          .catch(() => {/* silencioso — não interromper a leitura */});
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.status === 404
              ? 'Artigo não encontrado.'
              : (err.response?.data?.message ?? 'Erro ao carregar o artigo.'))
          : 'Erro inesperado.';
        setLoadError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id]);

  // ── Toggle Favorito (RB014, RB025) ────────────────────────────────────────
  const handleToggleFavorite = useCallback(async () => {
    if (!id || isFavLoading) return;
    // Optimistic update
    const prev = isFavorited;
    setIsFavorited(!prev);
    setFavoriteCount((c) => (prev ? Math.max(0, c - 1) : c + 1));
    setIsFavLoading(true);
    try {
      await knowledgeBaseService.interactions.toggleFavorite(id);
    } catch {
      // Reverter em caso de erro
      setIsFavorited(prev);
      setFavoriteCount((c) => (prev ? c + 1 : Math.max(0, c - 1)));
      showToast('Falha ao atualizar favorito. Tente novamente.', 'error');
    } finally {
      setIsFavLoading(false);
    }
  }, [id, isFavorited, isFavLoading, showToast]);

  // ── Marcar como Lido (RB032 — motor de gamificação) ───────────────────────
  const handleToggleRead = useCallback(async () => {
    if (!id || isReadLoading) return;
    const prev = isRead;
    setIsRead(!prev);
    setIsReadLoading(true);
    try {
      await knowledgeBaseService.interactions.markAsRead(id);
      if (!prev) {
        // Artigo marcado como lido — notifica sobre gamificação (RB033)
        showToast(
          '✅ Artigo marcado como lido! Progresso de conquista atualizado.',
          'success',
        );
      } else {
        showToast('Artigo desmarcado como lido.', 'info');
      }
    } catch {
      setIsRead(prev);
      showToast('Falha ao registar leitura. Tente novamente.', 'error');
    } finally {
      setIsReadLoading(false);
    }
  }, [id, isRead, isReadLoading, showToast]);

  // ── Copiar link ───────────────────────────────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast('Link copiado para a área de transferência!', 'success'))
      .catch(() => showToast('Falha ao copiar o link.', 'error'));
  };

  // ── Injetar botão copiar nos blocos de terminal após render ──────────────────
  useEffect(() => {
    if (!contentRef.current || !article) return;

    const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    const blocks = contentRef.current.querySelectorAll<HTMLElement>('pre.kb-terminal-pre');
    blocks.forEach((pre) => {
      // Evita duplicar botões em re-renders
      if (pre.querySelector('.kb-copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'kb-copy-btn';
      btn.type = 'button';
      btn.title = 'Copiar código';
      btn.innerHTML = COPY_SVG;

      btn.onclick = () => {
        const code = pre.querySelector('code');
        // Extrai o texto puro (sem o "> " do ::before)
        const text = (code?.textContent ?? '').replace(/^> /gm, '');
        navigator.clipboard.writeText(text).catch(() => {});
        btn.innerHTML = CHECK_SVG;
        setTimeout(() => { btn.innerHTML = COPY_SVG; }, 2000);
      };

      pre.appendChild(btn);
    });
  }, [article]);

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADOS DE LOADING / ERROR
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 h-full"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-[14px] text-[var(--color-text-faint)] font-medium">
          Carregando artigo...
        </p>
      </div>
    );
  }

  if (loadError || !article) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 h-full px-8 text-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
        >
          <AlertCircle size={28} />
        </div>
        <p className="text-[18px] font-bold text-[var(--color-text)]">
          {loadError ?? 'Artigo não encontrado'}
        </p>
        <Button variant="outline" onClick={() => navigate('/base-conhecimento')}>
          <ArrowLeft size={15} />
          Voltar à Base de Conhecimento
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          COLUNA PRINCIPAL — Artigo
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto min-w-0">

        {/* ── Barra de navegação superior ──────────────────────────────────── */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border)] shrink-0"
          style={{ backgroundColor: 'var(--color-surface)', backdropFilter: 'blur(8px)' }}
        >
          <button
            type="button"
            onClick={() => navigate('/base-conhecimento')}
            className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
            aria-label="Voltar à Base de Conhecimento"
          >
            <ArrowLeft size={15} />
            Base de Conhecimento
          </button>

          <span className="text-[var(--color-border)]">/</span>

          {article.category && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/base-conhecimento?categoryId=${article.category!.id}`)}
                className="text-[13px] font-semibold transition-colors truncate max-w-[160px]"
                style={{ color: 'var(--color-text-faint)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
              >
                {article.category.name}
              </button>
              <span className="text-[var(--color-border)]">/</span>
            </>
          )}

          <span className="text-[13px] text-[var(--color-text)] font-semibold truncate flex-1">
            {article.title}
          </span>

          {/* Ações de topo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copiar link"
              aria-label="Copiar link do artigo"
              className="w-8 h-8 rounded-[7px] flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-dim)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)';
              }}
            >
              <Share2 size={15} />
            </button>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/base-conhecimento/${id}/editar`)}
              >
                <Pencil size={13} />
                Editar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/base-conhecimento/${id}/historico`)}
            >
              <Clock size={13} />
              Histórico
            </Button>
          </div>
        </div>

        {/* ── Cabeçalho do artigo ───────────────────────────────────────────── */}
        <div className="max-w-[860px] mx-auto px-8 pt-10 pb-6">

          {/* Categoria + Status */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {article.category && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--color-accent)' }}>
                <Folder size={13} />
                {article.category.name}
              </span>
            )}
            <StatusBadge status={article.status} />
          </div>

          {/* Título */}
          <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-tight text-[var(--color-text)] mb-4">
            {article.title}
          </h1>

          {/* Excerpt / resumo — RB009: campo "summary" do backend */}
          {article.summary && (
            <p className="text-[16px] text-[var(--color-text-muted)] leading-relaxed mb-6 border-l-4 pl-4" style={{ borderColor: 'var(--color-accent)' }}>
              {article.summary}
            </p>
          )}

          {/* Meta: autor, data, tempo de leitura, visualizações */}
          <div className="flex items-center gap-4 flex-wrap mb-6">
            {article.author?.completeName && (
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                  style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent-text)' }}
                >
                  {article.author.completeName.charAt(0).toUpperCase()}
                </div>
                <span className="text-[13px] font-semibold text-[var(--color-text)]">
                  {article.author.completeName}
                </span>
              </div>
            )}

            {article.publishedAt && (
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-faint)]">
                <BookOpen size={12} />
                Publicado em {formatDate(article.publishedAt)}
              </span>
            )}

            {article.updatedAt && (
              <span className="text-[12px] text-[var(--color-text-faint)]">
                Atualizado em {formatDateTime(article.updatedAt)}
              </span>
            )}

            {/* RB023: Tempo estimado — campo "estimatedTimeInMinutes" do backend */}
            {article.estimatedTimeInMinutes && (
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-faint)]">
                <Clock size={12} />
                {article.estimatedTimeInMinutes} min de leitura
              </span>
            )}

            {/* RB023: Nível de dificuldade */}
            {article.difficulty && (
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-faint)]">
                {DIFFICULTY_LABELS[article.difficulty as DifficultyLevelType] ?? ''}
              </span>
            )}

            <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-faint)]">
              <Eye size={12} />
              {viewCount} visualizações
            </span>
          </div>

          {/* Tags */}
          {(article.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {(article.tags ?? []).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-colors"
                  style={{
                    backgroundColor: 'var(--color-accent-dim)',
                    color: 'var(--color-accent-text)',
                  }}
                >
                  <TagIcon size={10} />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Conteúdo do artigo (HTML do TipTap) ──────────────────────────── */}
        <div className="max-w-[860px] mx-auto px-8 pb-8">
          <div
            ref={contentRef}
            className="kb-content"
            dangerouslySetInnerHTML={{ __html: processTerminalContent(article.content ?? '') }}
          />
        </div>

        {/* ── Barra de Interações (sticky no rodapé) ───────────────────────── */}
        <div
          className="sticky bottom-0 border-t border-[var(--color-border)] z-10"
          style={{ backgroundColor: 'var(--color-surface)', backdropFilter: 'blur(8px)' }}
        >
          <div className="max-w-[860px] mx-auto px-8 py-3 flex items-center gap-3 flex-wrap">

            {/* ── Favoritar (RB014, RB025) ─────────────────────────────────── */}
            <button
              type="button"
              id="btn-favorite"
              onClick={handleToggleFavorite}
              disabled={isFavLoading}
              aria-pressed={isFavorited}
              aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isFavorited ? 'var(--color-error-subtle)' : 'var(--color-surface-dim)',
                borderColor: isFavorited ? 'var(--color-error)' : 'var(--color-border)',
                color: isFavorited ? 'var(--color-error)' : 'var(--color-text-muted)',
              }}
            >
              {isFavLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Heart
                  size={15}
                  className="transition-transform duration-200"
                  style={{
                    fill: isFavorited ? 'var(--color-error)' : 'none',
                    transform: isFavorited ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              )}
              {isFavorited ? 'Favoritado' : 'Favoritar'}
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isFavorited ? 'var(--color-error)' : 'var(--color-border)',
                  color: isFavorited ? 'white' : 'var(--color-text-faint)',
                }}
              >
                {favoriteCount}
              </span>
            </button>

            {/* ── Marcar como Lido (RB032 — Gamificação) ──────────────────── */}
            <button
              type="button"
              id="btn-mark-read"
              onClick={handleToggleRead}
              disabled={isReadLoading}
              aria-pressed={isRead}
              aria-label={isRead ? 'Desmarcar como lido' : 'Marcar como lido'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isRead ? 'var(--color-success-subtle)' : 'var(--color-surface-dim)',
                borderColor: isRead ? 'var(--color-success)' : 'var(--color-border)',
                color: isRead ? 'var(--color-success)' : 'var(--color-text-muted)',
              }}
            >
              {isReadLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2
                  size={15}
                  className="transition-transform"
                  style={{
                    fill: isRead ? 'var(--color-success)' : 'none',
                    color: isRead ? 'white' : 'var(--color-success)',
                    transform: isRead ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              )}
              {isRead ? 'Lido ✓' : 'Marcar como Lido'}
            </button>

            {/* Gamificação: badge de incentivo quando ainda não lido */}
            {!isRead && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-text-faint)' }}>
                <Trophy size={12} style={{ color: 'var(--color-warning)' }} />
                Marque como lido para avançar no progresso da categoria
              </div>
            )}

            <div className="flex-1" />

            {/* Visualizações */}
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-faint)]">
              <Eye size={13} />
              {viewCount} visualizações
            </span>

            {/* Autor (colapsado) */}
            {article.author?.completeName && (
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-faint)]">
                <User size={12} />
                {article.author.completeName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR DIREITA — Artigos Relacionados + Metadados
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="w-[300px] shrink-0 border-l border-[var(--color-border)] overflow-y-auto flex flex-col gap-6 p-5 hidden lg:flex"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* ── Metadados do artigo ───────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest mb-3">
            Informações
          </p>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                Status
              </dt>
              <dd>
                <StatusBadge status={article.status} />
              </dd>
            </div>
            {article.category && (
              <div>
                <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                  Categoria
                </dt>
                <dd className="text-[13px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                  <Folder size={12} style={{ color: 'var(--color-accent)' }} />
                  {article.category.name}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                Criado por
              </dt>
              <dd className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent-text)' }}
                >
                  {(article.author?.completeName || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  {article.author?.completeName || 'Sistema / Desconhecido'}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                Criado em
              </dt>
              <dd className="text-[13px] text-[var(--color-text)]">
                {formatDateShort(article.createdAt)}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                Última edição por
              </dt>
              <dd className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }}
                >
                  {(article.lastEditor?.completeName || article.updatedBy?.completeName || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  {article.lastEditor?.completeName || article.updatedBy?.completeName || 'Sistema / Nenhuma'}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                Última edição data
              </dt>
              <dd className="text-[13px] text-[var(--color-text)]">
                {formatDateTime(article.updatedAt || article.createdAt)}
              </dd>
            </div>
            {/* RB023: Tempo estimado — campo "estimatedTimeInMinutes" do backend */}
            {article.estimatedTimeInMinutes && (
              <div>
                <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                  Tempo estimado
                </dt>
                <dd className="text-[13px] text-[var(--color-text)] flex items-center gap-1.5">
                  <Clock size={12} style={{ color: 'var(--color-accent)' }} />
                  {article.estimatedTimeInMinutes} minutos
                </dd>
              </div>
            )}
            {/* RB023: Nível de dificuldade */}
            {article.difficulty && (
              <div>
                <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                  Dificuldade
                </dt>
                <dd className="text-[13px] font-semibold text-[var(--color-text)]">
                  {DIFFICULTY_LABELS[article.difficulty as DifficultyLevelType] ?? ''}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] font-semibold text-[var(--color-text-faint)] mb-0.5">
                Métricas
              </dt>
              <dd className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                  <Eye size={12} /> {viewCount}
                </span>
                <span className="flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                  <Heart size={12} style={{ fill: isFavorited ? 'var(--color-error)' : 'none', color: isFavorited ? 'var(--color-error)' : undefined }} />
                  {favoriteCount}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Divider */}
        <hr className="w-full border-t border-[var(--color-border-subtle)]" />

        {/* ── Seu progresso ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest mb-3">
            Seu Progresso
          </p>
          <div
            className="flex items-center gap-3 p-3 rounded-[10px] border"
            style={{
              backgroundColor: isRead ? 'var(--color-success-subtle)' : 'var(--color-surface-dim)',
              borderColor: isRead ? 'var(--color-success)' : 'var(--color-border)',
            }}
          >
            <CheckCircle2
              size={20}
              style={{
                color: isRead ? 'var(--color-success)' : 'var(--color-text-faint)',
                fill: isRead ? 'var(--color-success)' : 'none',
              }}
            />
            <div>
              <p
                className="text-[12px] font-bold"
                style={{ color: isRead ? 'var(--color-success)' : 'var(--color-text-faint)' }}
              >
                {isRead ? 'Artigo Concluído' : 'Não Lido'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
                {isRead
                  ? 'Contribui para a conquista da categoria'
                  : 'Marque como lido para ganhar conquistas'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Artigos Relacionados (RB030 — cruzamento de Tags) ────────────── */}
        {(article.relatedArticles ?? []).length > 0 && (
          <>
            <hr className="w-full border-t border-[var(--color-border-subtle)]" />
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest mb-3">
                Artigos Relacionados
              </p>
              <div className="flex flex-col gap-2">
                {(article.relatedArticles ?? []).map((related) => (
                  <RelatedCard
                    key={related.id}
                    article={related}
                    onOpen={(relId) => navigate(`/base-conhecimento/${relId}`)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
