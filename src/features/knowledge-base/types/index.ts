// ─────────────────────────────────────────────────────────────────────────────
// knowledge-base/types/index.ts
// Espelha os DTOs do backend ASP.NET Core (Controllers lidos em 2026-07-14).
// ATENÇÃO: todos os IDs são Guid → string no TypeScript.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PAGINAÇÃO
// Formato real devolvido por GET /api/knowledge-base/articles:
//   { data: Article[], totalCount: number }
// ─────────────────────────────────────────────────────────────────────────────
export interface ArticleSearchResponse {
  data: ArticleSummary[];
  totalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nó da árvore de categorias (GET /api/knowledge-base/categories/tree).
 * RB021: As categorias podem possuir subcategorias (árvore de navegação).
 */
export interface CategoryTreeNode {
  id: string;           // Guid
  name: string;
  slug?: string | null;
  description?: string | null;
  iconName?: string | null;
  parentCategoryId?: string | null; // Guid
  /** Filhos recursivos — pode ser [] */
  children: CategoryTreeNode[];
  /** Contador de artigos publicados nesta categoria (e sub-categorias) */
  articleCount?: number;
}

/**
 * Body de criação de categoria.
 * POST /api/knowledge-base/categories — requer role Administrator.
 */
export interface CreateKnowledgeCategoryRequest {
  name: string;
  description?: string;
  parentCategoryId?: string | null; // Guid
}

/**
 * Body de atualização de categoria.
 * PUT /api/knowledge-base/categories/{id} — requer role Administrator.
 * O backend valida que id da rota == request.Id.
 */
export interface UpdateKnowledgeCategoryRequest {
  id: string;           // Guid — OBRIGATÓRIO (backend valida rota vs body)
  name?: string;
  description?: string;
  parentCategoryId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// GET /api/knowledge-base/tags  → sem autorização
// POST /api/knowledge-base/tags → Editor | Administrator
// DELETE /api/knowledge-base/tags/{id} → Administrator
// Não existe endpoint PUT de tags.
// ─────────────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;           // Guid
  name: string;
  slug?: string | null;
  color?: string | null;
}

/**
 * Body de criação de tag.
 * POST /api/knowledge-base/tags
 */
export interface CreateKnowledgeTagRequest {
  name: string;
  color?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIGOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status de publicação do artigo (espelha o enum ArticleStatus do C#).
 * RB012: Draft | Published | Archived.
 */
export const ArticleStatus = {
  Draft:     0,
  Published: 1,
  Archived:  2,
} as const;

export type ArticleStatusType = typeof ArticleStatus[keyof typeof ArticleStatus];

export const ARTICLE_STATUS_LABELS: Record<ArticleStatusType, string> = {
  0: 'Rascunho',
  1: 'Publicado',
  2: 'Arquivado',
};

/** Autor simplificado embutido no DTO do artigo */
export interface ArticleAuthor {
  userId: string;         // Guid
  completeName?: string | null;
  email?: string | null;
}

/**
 * Resumo do artigo — usado nos cards da listagem (GET /api/knowledge-base/articles).
 * RB023: Metadados obrigatórios: autor original, datas, tempo estimado, nível.
 */
export interface ArticleSummary {
  id: string;             // Guid
  title: string;
  slug: string;
  excerpt?: string | null;
  status: ArticleStatusType;
  coverImageUrl?: string | null;
  category?: {
    id: string;           // Guid
    name: string;
  } | null;
  tags: Tag[];
  author?: ArticleAuthor | null;
  /** RB024: Contador de visualizações */
  viewCount: number;
  /** RB025: Contador de favoritos */
  favoriteCount?: number;
  /** Se o utilizador logado marcou como favorito (RB014) */
  isFavorited: boolean;
  /** Se o utilizador logado marcou como lido (RB032) */
  isRead: boolean;
  /** RB023: Tempo estimado de leitura em minutos */
  estimatedReadingTimeMinutes?: number | null;
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
  publishedAt?: string | null;
}

/**
 * Detalhamento completo do artigo — GET /api/knowledge-base/articles/{id}.
 * Inclui o conteúdo HTML gerado pelo TipTap e artigos relacionados (RB030).
 */
export interface ArticleDetail extends ArticleSummary {
  /** Conteúdo HTML completo (TipTap → HTML) */
  content: string;
  /** RB031: Artigos relacionados por cruzamento de Tags */
  relatedArticles?: ArticleSummary[];
}

/**
 * Parâmetros de query para GET /api/knowledge-base/articles.
 * Nomes exactos dos [FromQuery] do controller.
 * RB026-RB029: Full-Text Search (FTS) case-insensitive, accent-insensitive.
 */
export interface ArticleSearchParams {
  /** RB026: Pesquisa em título, resumo, conteúdo, tags, comandos, etc. */
  searchTerm?: string;
  /** Filtro por categoria (Guid) */
  categoryId?: string;
  /** Paginação — pageNumber (default 1) */
  pageNumber?: number;
  /** Paginação — pageSize (default 10) */
  pageSize?: number;
}

/**
 * Body de criação de artigo.
 * POST /api/knowledge-base/articles — requer Editor | Administrator.
 * RB008: título max 150 chars. RB009: excerpt obrigatório.
 * RB010: categoryId obrigatório. RB011: mínimo 1 tag.
 */
export interface CreateKnowledgeArticleRequest {
  title: string;          // RB008: obrigatório, max 150 chars
  excerpt: string;        // RB009: obrigatório
  content: string;
  categoryId: string;     // Guid — RB010: obrigatório
  tagIds: string[];       // Guid[] — RB011: mínimo 1
  status: ArticleStatusType;
  coverImageUrl?: string;
  estimatedReadingTimeMinutes?: number;
}

/**
 * Body de atualização de artigo.
 * PUT /api/knowledge-base/articles — SEM {id} na rota, o ID vem no body.
 * RB004: Toda edição gera nova versão.
 */
export interface UpdateKnowledgeArticleRequest {
  id: string;             // Guid — OBRIGATÓRIO no body (não há {id} na rota)
  title?: string;
  excerpt?: string;
  content?: string;
  categoryId?: string;    // Guid
  tagIds?: string[];      // Guid[]
  status?: ArticleStatusType;
  coverImageUrl?: string;
  estimatedReadingTimeMinutes?: number;
  /** RB020: Descrição da alteração para o log de auditoria */
  changeDescription?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERAÇÕES
// Rota base: /api/knowledge-base/interactions/{articleId}/...
// RB014: Favoritos individuais por utilizador.
// RB015: Histórico de visualizações por utilizador.
// RB024: Contador de visualizações no artigo.
// RB032: Read Tracking para motor de gamificação (RB033, RB034).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resposta genérica dos endpoints de interação.
 * O backend retorna 200 OK sem body estruturado — tratamos como void.
 */
export type InteractionResponse = void;
