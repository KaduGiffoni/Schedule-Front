// ─────────────────────────────────────────────────────────────────────────────
// knowledge-base/types/index.ts
// Espelha os DTOs do backend. Campos de navegação opcionais — use optional chaining.
// ─────────────────────────────────────────────────────────────────────────────

// ── Resultado paginado genérico ───────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────

/** Nó da árvore de categorias (GET /api/knowledge-base/categories/tree) */
export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  iconName?: string | null;
  /** Filhos recursivos — pode ser [] */
  children: CategoryTreeNode[];
  /** Número total de artigos publicados nesta categoria (incluindo sub-categorias) */
  articleCount?: number;
}

/** Shape plana de categoria (GET /api/knowledge-base/categories) */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  iconName?: string | null;
  parentCategoryId?: number | null;
}

/** Body de criação/edição de categoria */
export interface UpsertCategoryDTO {
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
  parentCategoryId?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
}

/** Body de criação/edição de tag */
export interface UpsertTagDTO {
  name: string;
  slug: string;
  color?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIGOS
// ─────────────────────────────────────────────────────────────────────────────

/** Status de publicação do artigo */
export const ArticleStatus = {
  Draft:     'draft',
  Published: 'published',
  Archived:  'archived',
} as const;

export type ArticleStatusType = typeof ArticleStatus[keyof typeof ArticleStatus];

export const ARTICLE_STATUS_LABELS: Record<ArticleStatusType, string> = {
  draft:     'Rascunho',
  published: 'Publicado',
  archived:  'Arquivado',
};

/** Autor simplificado dentro de um artigo */
export interface ArticleAuthor {
  userId: string;
  completeName?: string | null;
  email?: string | null;
}

/** Resumo do artigo (usado no card da listagem paginada) */
export interface ArticleSummary {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  status: ArticleStatusType;
  coverImageUrl?: string | null;
  /** Categoria principal */
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  tags: Tag[];
  author?: ArticleAuthor | null;
  viewCount: number;
  /** Se o usuário logado marcou como favorito */
  isFavorited: boolean;
  /** Se o usuário logado marcou como lido */
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

/** Detalhamento completo do artigo (GET /api/knowledge-base/articles/{id}) */
export interface ArticleDetail extends ArticleSummary {
  /** Conteúdo HTML gerado pelo TipTap */
  content: string;
  /** Tempo estimado de leitura em minutos */
  readingTimeMinutes?: number | null;
  /** Lista de artigos relacionados (opcional do backend) */
  relatedArticles?: ArticleSummary[];
}

/** Parâmetros de busca/filtro da listagem paginada */
export interface ArticleSearchParams {
  search?: string;
  categoryId?: number;
  tagIds?: number[];
  status?: ArticleStatusType;
  page?: number;
  pageSize?: number;
}

/** Body de criação de artigo (POST /api/knowledge-base/articles) */
export interface CreateArticleDTO {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  categoryId?: number | null;
  tagIds?: number[];
  status: ArticleStatusType;
  coverImageUrl?: string;
}

/** Body de edição de artigo (PUT /api/knowledge-base/articles/{id}) */
export interface UpdateArticleDTO extends Partial<CreateArticleDTO> {}

// ─────────────────────────────────────────────────────────────────────────────
// INTERAÇÕES  (View · Favorite · Read)
// ─────────────────────────────────────────────────────────────────────────────

/** Tipos de interação disponíveis */
export const InteractionType = {
  View:     'view',
  Favorite: 'favorite',
  Read:     'read',
} as const;

export type InteractionTypeValue = typeof InteractionType[keyof typeof InteractionType];

/**
 * Resposta genérica de interação.
 * O backend pode retornar `{ message: string }` ou `{ mensagem: string }` — ambos cobertos.
 */
export interface InteractionResponse {
  message?: string;
  mensagem?: string;
  /** Para toggle de favorito, o backend pode indicar o estado atual */
  isFavorited?: boolean;
  /** Para toggle de lido, o backend pode indicar o estado atual */
  isRead?: boolean;
}
