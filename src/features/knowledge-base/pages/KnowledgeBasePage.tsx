import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Folder,
  Heart,
  Loader2,
  Plus,
  Search,
  Tag as TagIcon,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { knowledgeBaseService } from '../api/knowledgeBaseService';
import {
  ArticleStatus,
  ARTICLE_STATUS_LABELS,
  type ArticleSummary,
  type CategoryTreeNode,
  type Tag,
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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: number }) => {
  const cfg: Record<number, { label: string; cls: string }> = {
    [ArticleStatus.Draft]:     { label: ARTICLE_STATUS_LABELS[0], cls: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)]' },
    [ArticleStatus.Published]: { label: ARTICLE_STATUS_LABELS[1], cls: 'bg-[var(--color-success-subtle)] text-[var(--color-success)]' },
    [ArticleStatus.Archived]:  { label: ARTICLE_STATUS_LABELS[2], cls: 'bg-[var(--color-surface-dim)] text-[var(--color-text-faint)]' },
  };
  const c = cfg[status] ?? cfg[ArticleStatus.Draft];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>
      {c.label}
    </span>
  );
};

// ── Tag Pill ─────────────────────────────────────────────────────────────────
const TagPill = ({
  tag,
  selected,
  onClick,
}: {
  tag: Tag;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
      selected
        ? 'bg-[var(--color-accent)] text-white'
        : 'bg-[var(--color-surface-dim)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-dim)] hover:text-[var(--color-accent-text)]'
    }`}
  >
    <TagIcon size={9} />
    {tag.name}
  </button>
);

// ── Category Tree Node ────────────────────────────────────────────────────────
const CategoryNode = ({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: CategoryTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) => {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) setOpen((o) => !o);
          onSelect(isSelected ? null : node.id);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all text-left ${
          isSelected
            ? 'bg-[var(--color-accent)] text-white'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]'
        }`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown size={13} className="shrink-0 opacity-70" />
          ) : (
            <ChevronRight size={13} className="shrink-0 opacity-70" />
          )
        ) : (
          <Folder size={13} className="shrink-0 opacity-60" />
        )}
        <span className="flex-1 truncate">{node.name}</span>
        {node.articleCount !== undefined && node.articleCount > 0 && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              isSelected
                ? 'bg-white/20 text-white'
                : 'bg-[var(--color-surface-dim)] text-[var(--color-text-faint)]'
            }`}
          >
            {node.articleCount}
          </span>
        )}
      </button>

      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Article Card ──────────────────────────────────────────────────────────────
const ArticleCard = ({
  article,
  onOpen,
}: {
  article: ArticleSummary;
  onOpen: (id: string) => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      className="group relative flex flex-col rounded-[14px] border border-[var(--color-border)] overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        backgroundColor: 'var(--color-surface)',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        borderColor: hovered ? 'var(--color-accent)' : 'var(--color-border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(article.id)}
      aria-label={`Ver artigo: ${article.title}`}
    >
      {/* Topo colorido como acento visual */}
      <div
        className="h-[3px] w-full"
        style={{
          background: article.isRead
            ? 'var(--color-success)'
            : 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))',
          opacity: article.isRead ? 0.6 : 1,
        }}
      />

      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Cabeçalho: categoria + status */}
        <div className="flex items-center justify-between gap-2">
          {article.category ? (
            <span className="text-[11px] font-semibold text-[var(--color-accent)] flex items-center gap-1 truncate">
              <Folder size={11} />
              {article.category.name}
            </span>
          ) : (
            <span />
          )}
          <StatusBadge status={article.status} />
        </div>

        {/* Título */}
        <h3 className="text-[15px] font-bold text-[var(--color-text)] leading-snug line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed line-clamp-3 flex-1">
            {article.excerpt}
          </p>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-surface-dim)] text-[var(--color-text-faint)]"
              >
                <TagIcon size={8} />
                {tag.name}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="text-[10px] text-[var(--color-text-faint)] self-center">
                +{article.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rodapé: métricas */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-subtle)]"
        style={{ backgroundColor: 'var(--color-surface-dim)' }}
      >
        <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-faint)]">
          <span className="flex items-center gap-1">
            <Eye size={11} />
            {article.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={11} className={article.isFavorited ? 'text-[var(--color-error)]' : ''} />
            {article.favoriteCount ?? 0}
          </span>
          {article.estimatedReadingTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {article.estimatedReadingTimeMinutes}min
            </span>
          )}
        </div>

        {/* Indicador de leitura */}
        <div className="flex items-center gap-1.5">
          {article.isRead && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-success)]">
              <CheckCircle2 size={11} />
              Lido
            </span>
          )}
          <span className="text-[10px] text-[var(--color-text-faint)]">
            {timeAgo(article.updatedAt)}
          </span>
        </div>
      </div>
    </article>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onClear }: { onClear: () => void }) => (
  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
      style={{ backgroundColor: 'var(--color-surface-dim)', color: 'var(--color-text-faint)' }}
    >
      <BookOpen size={36} />
    </div>
    <p className="text-[18px] font-bold text-[var(--color-text)] mb-1">
      Nenhum artigo encontrado
    </p>
    <p className="text-[13px] text-[var(--color-text-muted)] max-w-sm mb-5">
      Tente ajustar o termo de pesquisa, remover filtros ou selecionar uma categoria diferente.
    </p>
    <Button variant="outline" size="sm" onClick={onClear}>
      Limpar filtros
    </Button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  // RB002: apenas Admin ou Manager podem criar/editar artigos.
  const canCreate = useHasRole('Admin', 'Manager');

  // ── Estado: árvore de categorias ──────────────────────────────────────────
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [isCatLoading, setIsCatLoading] = useState(true);

  // ── Estado: tags ──────────────────────────────────────────────────────────
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // ── Estado: filtros ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // ── Estado: artigos ───────────────────────────────────────────────────────
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [isArticlesLoading, setIsArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasActiveFilters =
    !!debouncedSearch || !!selectedCategoryId || selectedTagIds.length > 0;

  // ── Debounce da pesquisa ──────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPageNumber(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // ── Carregar árvore de categorias e tags (uma vez) ───────────────────────
  useEffect(() => {
    const load = async () => {
      setIsCatLoading(true);
      try {
        const [tree, tags] = await Promise.all([
          knowledgeBaseService.categories.getTree(),
          knowledgeBaseService.tags.getAll(),
        ]);
        setCategoryTree(Array.isArray(tree) ? tree : []);
        setAllTags(Array.isArray(tags) ? tags : []);
      } catch {
        showToast('Falha ao carregar categorias e tags.', 'error');
      } finally {
        setIsCatLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar artigos sempre que filtros ou página mudam ───────────────────
  const fetchArticles = useCallback(async () => {
    setIsArticlesLoading(true);
    setArticlesError(null);
    try {
      const result = await knowledgeBaseService.articles.search({
        searchTerm: debouncedSearch || undefined,
        categoryId: selectedCategoryId || undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setArticles(Array.isArray(result.data) ? result.data : []);
      setTotalCount(result.totalCount ?? 0);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? err.response?.data?.mensagem ?? 'Erro ao carregar artigos.')
        : 'Erro inesperado.';
      setArticlesError(msg);
      showToast(msg, 'error');
    } finally {
      setIsArticlesLoading(false);
    }
  }, [debouncedSearch, selectedCategoryId, pageNumber, showToast]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCategorySelect = (id: string | null) => {
    setSelectedCategoryId(id);
    setPageNumber(1);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
    setPageNumber(1);
  };

  const handleClearAll = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategoryId(null);
    setSelectedTagIds([]);
    setPageNumber(1);
  };

  const handleOpenArticle = (id: string) => {
    navigate(`/base-conhecimento/${id}`);
  };

  // ── Filtro de tags client-side (as tags não são parâmetro de rota no backend) ──
  const filteredArticles =
    selectedTagIds.length > 0
      ? articles.filter((a) =>
          selectedTagIds.every((tid) => a.tags.some((t) => t.id === tid)),
        )
      : articles;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR — Árvore de Categorias
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="w-[260px] shrink-0 flex flex-col overflow-hidden border-r border-[var(--color-border)]"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Header do sidebar */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--color-border-subtle)] shrink-0">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent-text)' }}
          >
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[var(--color-text)] truncate">
              Base de Conhecimento
            </p>
            <p className="text-[11px] text-[var(--color-text-faint)]">
              Procedimentos NOC
            </p>
          </div>
        </div>

        {/* Botão "Todos os artigos" */}
        <div className="px-3 pt-4 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCategorySelect(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] font-semibold transition-all text-left ${
              !selectedCategoryId
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]'
            }`}
          >
            <BookOpen size={14} className="shrink-0" />
            <span className="flex-1">Todos os artigos</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                !selectedCategoryId
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--color-surface-dim)] text-[var(--color-text-faint)]'
              }`}
            >
              {totalCount}
            </span>
          </button>

          <p className="mt-4 mb-2 px-1 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">
            Categorias
          </p>
        </div>

        {/* Árvore de categorias */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {isCatLoading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
              <span className="text-[12px] text-[var(--color-text-faint)]">Carregando...</span>
            </div>
          ) : categoryTree.length === 0 ? (
            <p className="px-2 py-4 text-[12px] text-[var(--color-text-faint)] italic">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            categoryTree.map((node) => (
              <CategoryNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedCategoryId}
                onSelect={handleCategorySelect}
              />
            ))
          )}
        </div>

        {/* Tags no rodapé do sidebar */}
        {allTags.length > 0 && (
          <div className="px-4 pb-4 pt-3 border-t border-[var(--color-border-subtle)] shrink-0">
            <p className="mb-2 text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-widest">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 12).map((tag) => (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  selected={selectedTagIds.includes(tag.id)}
                  onClick={() => handleTagToggle(tag.id)}
                />
              ))}
              {allTags.length > 12 && (
                <span className="text-[10px] text-[var(--color-text-faint)] self-center">
                  +{allTags.length - 12}
                </span>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          ÁREA PRINCIPAL
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top Bar: pesquisa + CTA ──────────────────────────────────────── */}
        <div
          className="flex items-center gap-4 px-6 py-4 border-b border-[var(--color-border)] shrink-0"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {/* Barra de pesquisa FTS */}
          <div className="flex-1 relative max-w-[520px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-faint)' }}
            />
            <input
              type="search"
              id="kb-search"
              placeholder="Pesquisar procedimentos, comandos, VLANs, equipamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 text-[13px] rounded-[8px]"
              style={{
                backgroundColor: 'var(--color-surface-dim)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-dim)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Limpar pesquisa"
                style={{ color: 'var(--color-text-faint)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Limpar filtros ativos */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold transition-colors"
              style={{
                backgroundColor: 'var(--color-warning-subtle)',
                color: 'var(--color-warning)',
                border: '1px solid var(--color-warning)',
              }}
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}

          {/* Novo artigo — só para Editor/Administrator */}
          {canCreate && (
            <Button
              size="sm"
              onClick={() => navigate('/base-conhecimento/novo')}
              className="shrink-0"
            >
              <Plus size={15} />
              Novo Artigo
            </Button>
          )}
        </div>

        {/* ── Chips de filtros ativos ──────────────────────────────────────── */}
        {hasActiveFilters && (
          <div
            className="flex items-center gap-2 flex-wrap px-6 py-2.5 border-b border-[var(--color-border-subtle)] shrink-0"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <span className="text-[11px] text-[var(--color-text-faint)] font-semibold">
              Filtros:
            </span>
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-accent-dim)] text-[var(--color-accent-text)]">
                <Search size={10} />
                "{debouncedSearch}"
                <button type="button" onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }} aria-label="Remover filtro de pesquisa">
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedCategoryId && (() => {
              const findName = (nodes: CategoryTreeNode[]): string => {
                for (const n of nodes) {
                  if (n.id === selectedCategoryId) return n.name;
                  const found = findName(n.children);
                  if (found) return found;
                }
                return selectedCategoryId;
              };
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-accent-dim)] text-[var(--color-accent-text)]">
                  <Folder size={10} />
                  {findName(categoryTree)}
                  <button type="button" onClick={() => handleCategorySelect(null)} aria-label="Remover filtro de categoria">
                    <X size={10} />
                  </button>
                </span>
              );
            })()}
            {selectedTagIds.map((tid) => {
              const tag = allTags.find((t) => t.id === tid);
              return tag ? (
                <span key={tid} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-accent-dim)] text-[var(--color-accent-text)]">
                  <TagIcon size={10} />
                  {tag.name}
                  <button type="button" onClick={() => handleTagToggle(tid)} aria-label={`Remover tag ${tag.name}`}>
                    <X size={10} />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* ── Cabeçalho da grid: contagem + paginação ──────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-[var(--color-border-subtle)]"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <p className="text-[12px] text-[var(--color-text-faint)]">
            {isArticlesLoading ? (
              'Buscando artigos...'
            ) : (
              <>
                <span className="font-bold text-[var(--color-text)]">{totalCount}</span>
                {' '}artigo{totalCount !== 1 ? 's' : ''}
                {hasActiveFilters ? ' encontrado' + (totalCount !== 1 ? 's' : '') : ''}
              </>
            )}
          </p>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-[6px] text-[12px] font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dim)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="px-3 text-[12px] text-[var(--color-text-faint)]">
                <span className="font-bold text-[var(--color-text)]">{pageNumber}</span>
                {' / '}{totalPages}
              </span>
              <button
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-[6px] text-[12px] font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dim)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>

        {/* ── Grid de Cards ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isArticlesLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
              <span className="text-[13px] text-[var(--color-text-faint)] font-medium">
                Buscando artigos...
              </span>
            </div>
          ) : articlesError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <AlertCircle size={32} style={{ color: 'var(--color-error)' }} />
              <p className="text-[14px] font-semibold text-[var(--color-text)]">
                Falha ao carregar artigos
              </p>
              <p className="text-[12px] text-[var(--color-text-faint)]">{articlesError}</p>
              <Button variant="outline" size="sm" onClick={fetchArticles}>
                Tentar novamente
              </Button>
            </div>
          ) : filteredArticles.length === 0 ? (
            <EmptyState onClear={handleClearAll} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onOpen={handleOpenArticle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
