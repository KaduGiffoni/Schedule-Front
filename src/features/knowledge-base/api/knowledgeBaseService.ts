// ─────────────────────────────────────────────────────────────────────────────
// knowledge-base/api/knowledgeBaseService.ts
// Usa o axios já configurado com interceptor de JWT (src/lib/axios.ts).
// Todos os métodos lançam o AxiosError original — trate no chamador com toast.
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '../../../lib/axios';
import type {
  PagedResult,
  CategoryTreeNode,
  Category,
  UpsertCategoryDTO,
  Tag,
  UpsertTagDTO,
  ArticleSummary,
  ArticleDetail,
  ArticleSearchParams,
  CreateArticleDTO,
  UpdateArticleDTO,
  InteractionResponse,
} from '../types';

const BASE = '/api/knowledge-base';

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────

const categories = {
  /**
   * GET /api/knowledge-base/categories/tree
   * Retorna a árvore completa de categorias com filhos recursivos.
   */
  getTree: async (): Promise<CategoryTreeNode[]> => {
    const res = await api.get<CategoryTreeNode[]>(`${BASE}/categories/tree`);
    return res.data;
  },

  /**
   * GET /api/knowledge-base/categories
   * Lista plana de todas as categorias (útil para selects).
   */
  getAll: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>(`${BASE}/categories`);
    return res.data;
  },

  /**
   * GET /api/knowledge-base/categories/{id}
   */
  getById: async (id: number): Promise<Category> => {
    const res = await api.get<Category>(`${BASE}/categories/${id}`);
    return res.data;
  },

  /**
   * POST /api/knowledge-base/categories
   * Requer role Admin/Manager. Lança AxiosError 400/403 em caso de falha.
   */
  create: async (data: UpsertCategoryDTO): Promise<Category> => {
    const res = await api.post<Category>(`${BASE}/categories`, data);
    return res.data;
  },

  /**
   * PUT /api/knowledge-base/categories/{id}
   */
  update: async (id: number, data: UpsertCategoryDTO): Promise<Category> => {
    const res = await api.put<Category>(`${BASE}/categories/${id}`, data);
    return res.data;
  },

  /**
   * DELETE /api/knowledge-base/categories/{id}
   */
  remove: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/categories/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────────────────────────────────────

const tags = {
  /**
   * GET /api/knowledge-base/tags
   */
  getAll: async (): Promise<Tag[]> => {
    const res = await api.get<Tag[]>(`${BASE}/tags`);
    return res.data;
  },

  /**
   * POST /api/knowledge-base/tags
   */
  create: async (data: UpsertTagDTO): Promise<Tag> => {
    const res = await api.post<Tag>(`${BASE}/tags`, data);
    return res.data;
  },

  /**
   * PUT /api/knowledge-base/tags/{id}
   */
  update: async (id: number, data: UpsertTagDTO): Promise<Tag> => {
    const res = await api.put<Tag>(`${BASE}/tags/${id}`, data);
    return res.data;
  },

  /**
   * DELETE /api/knowledge-base/tags/{id}
   */
  remove: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/tags/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ARTIGOS
// ─────────────────────────────────────────────────────────────────────────────

const articles = {
  /**
   * GET /api/knowledge-base/articles
   * Suporta full-text search, filtros e paginação.
   *
   * @example
   * knowledgeBaseService.articles.getAll({ search: 'VPN', categoryId: 3, page: 1, pageSize: 12 })
   */
  getAll: async (params: ArticleSearchParams = {}): Promise<PagedResult<ArticleSummary>> => {
    // tagIds é um array — serializa como múltiplos query params (ex: tagIds=1&tagIds=2)
    const { tagIds, ...rest } = params;
    const res = await api.get<PagedResult<ArticleSummary>>(`${BASE}/articles`, {
      params: {
        ...rest,
        ...(tagIds && tagIds.length > 0 ? { tagIds } : {}),
      },
      // Garante que arrays viram params repetidos em vez de "tagIds[]=1"
      paramsSerializer: (p) =>
        Object.entries(p)
          .flatMap(([key, val]) =>
            Array.isArray(val)
              ? val.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
              : [`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`],
          )
          .join('&'),
    });
    return res.data;
  },

  /**
   * GET /api/knowledge-base/articles/{id}
   * Retorna o artigo completo com conteúdo HTML.
   */
  getById: async (id: number): Promise<ArticleDetail> => {
    const res = await api.get<ArticleDetail>(`${BASE}/articles/${id}`);
    return res.data;
  },

  /**
   * POST /api/knowledge-base/articles
   * Requer role Admin/Manager/Editor.
   */
  create: async (data: CreateArticleDTO): Promise<ArticleDetail> => {
    const res = await api.post<ArticleDetail>(`${BASE}/articles`, data);
    return res.data;
  },

  /**
   * PUT /api/knowledge-base/articles/{id}
   */
  update: async (id: number, data: UpdateArticleDTO): Promise<ArticleDetail> => {
    const res = await api.put<ArticleDetail>(`${BASE}/articles/${id}`, data);
    return res.data;
  },

  /**
   * DELETE /api/knowledge-base/articles/{id}
   */
  remove: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/articles/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERAÇÕES  (View · Favorite · Read)
// Motor de gamificação — crucial para o tracking de progresso do utilizador.
// ─────────────────────────────────────────────────────────────────────────────

const interactions = {
  /**
   * POST /api/knowledge-base/articles/{id}/view
   * Regista uma visualização. Chamada automática ao abrir o artigo.
   * Idempotente — múltiplas chamadas incrementam o counter mas não duplicam logs.
   */
  registerView: async (articleId: number): Promise<InteractionResponse> => {
    const res = await api.post<InteractionResponse>(
      `${BASE}/articles/${articleId}/view`,
    );
    return res.data;
  },

  /**
   * POST /api/knowledge-base/articles/{id}/favorite
   * Toggle: se já favoritado, desfavorita; caso contrário, favorita.
   * O estado atual vem no campo `isFavorited` da resposta.
   */
  toggleFavorite: async (articleId: number): Promise<InteractionResponse> => {
    const res = await api.post<InteractionResponse>(
      `${BASE}/articles/${articleId}/favorite`,
    );
    return res.data;
  },

  /**
   * POST /api/knowledge-base/articles/{id}/read
   * Marca o artigo como lido pelo utilizador logado.
   * Obrigatório para o motor de gamificação contabilizar progresso.
   * Toggle: se já lido, marca como não-lido.
   */
  toggleRead: async (articleId: number): Promise<InteractionResponse> => {
    const res = await api.post<InteractionResponse>(
      `${BASE}/articles/${articleId}/read`,
    );
    return res.data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Export principal — use como: knowledgeBaseService.articles.getAll(...)
// ─────────────────────────────────────────────────────────────────────────────

export const knowledgeBaseService = {
  categories,
  tags,
  articles,
  interactions,
} as const;
