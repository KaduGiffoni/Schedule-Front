// ─────────────────────────────────────────────────────────────────────────────
// knowledge-base/api/knowledgeBaseService.ts
// Usa o axios configurado em src/lib/axios.ts (interceptor JWT automático).
// Contratos extraídos diretamente dos controllers C# lidos em 2026-07-14.
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '../../../lib/axios';
import type {
  ArticleSearchResponse,
  ArticleSummary,
  ArticleDetail,
  ArticleSearchParams,
  CreateKnowledgeArticleRequest,
  UpdateKnowledgeArticleRequest,
  CategoryTreeNode,
  CreateKnowledgeCategoryRequest,
  UpdateKnowledgeCategoryRequest,
  Tag,
  CreateKnowledgeTagRequest,
} from '../types';

const BASE = '/api/knowledge-base';

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIAS
// Controller: KnowledgeCategoriesController → Route: api/knowledge-base/categories
// ─────────────────────────────────────────────────────────────────────────────

const categories = {
  /**
   * GET /api/knowledge-base/categories/tree
   * Árvore completa de categorias para o sidebar (RB021).
   * Não requer autorização especial (qualquer utilizador autenticado).
   */
  getTree: async (): Promise<CategoryTreeNode[]> => {
    const res = await api.get<CategoryTreeNode[]>(`${BASE}/categories/tree`);
    return res.data;
  },

  /**
   * POST /api/knowledge-base/categories
   * Requer role: Administrator.
   * @throws AxiosError 400 (validação) | 403 (sem permissão)
   */
  create: async (data: CreateKnowledgeCategoryRequest): Promise<CategoryTreeNode> => {
    const res = await api.post<CategoryTreeNode>(`${BASE}/categories`, data);
    return res.data;
  },

  /**
   * PUT /api/knowledge-base/categories/{id}
   * Requer role: Administrator.
   * ATENÇÃO: o backend valida que o id da rota == request.Id — ambos devem coincidir.
   * @throws AxiosError 400 se IDs divergirem | 403 sem permissão
   */
  update: async (id: string, data: UpdateKnowledgeCategoryRequest): Promise<CategoryTreeNode> => {
    // Garante que o Id no body corresponde ao da rota
    const res = await api.put<CategoryTreeNode>(`${BASE}/categories/${id}`, {
      ...data,
      id,
    });
    return res.data;
  },

  /**
   * DELETE /api/knowledge-base/categories/{id}
   * Requer role: Administrator.
   * Retorna 204 No Content em caso de sucesso.
   */
  remove: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/categories/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// Controller: KnowledgeTagsController → Route: api/knowledge-base/tags
// Não existe endpoint PUT — tags não são editáveis, apenas criadas e removidas.
// ─────────────────────────────────────────────────────────────────────────────

const tags = {
  /**
   * GET /api/knowledge-base/tags
   * Lista todas as tags. Não requer autorização especial.
   */
  getAll: async (): Promise<Tag[]> => {
    const res = await api.get<Tag[]>(`${BASE}/tags`);
    return res.data;
  },

  /**
   * POST /api/knowledge-base/tags
   * Requer role: Editor | Administrator.
   * RB022: Tags não podem ser duplicadas.
   */
  create: async (data: CreateKnowledgeTagRequest): Promise<Tag> => {
    const res = await api.post<Tag>(`${BASE}/tags`, data);
    return res.data;
  },

  /**
   * DELETE /api/knowledge-base/tags/{id}
   * Requer role: Administrator.
   * Retorna 204 No Content.
   */
  remove: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/tags/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ARTIGOS
// Controller: KnowledgeArticlesController → Route: api/knowledge-base/articles
// Todos os endpoints requerem [Authorize] (qualquer utilizador autenticado).
// ─────────────────────────────────────────────────────────────────────────────

const articles = {
  /**
   * GET /api/knowledge-base/articles
   * Pesquisa paginada com Full-Text Search (RB026-RB029).
   * RB013: Não-admins recebem apenas artigos Published (filtrado pelo backend).
   *
   * Retorna: { data: ArticleSummary[], totalCount: number }
   *
   * @example
   * knowledgeBaseService.articles.search({ searchTerm: 'VLAN', categoryId: 'xxx-guid', pageNumber: 1 })
   */
  search: async (params: ArticleSearchParams = {}): Promise<ArticleSearchResponse> => {
    const res = await api.get<ArticleSearchResponse>(`${BASE}/articles`, {
      params: {
        searchTerm: params.searchTerm || undefined,
        categoryId: params.categoryId || undefined,
        pageNumber: params.pageNumber ?? 1,
        pageSize:   params.pageSize   ?? 10,
      },
    });
    return res.data;
  },

  /**
   * GET /api/knowledge-base/articles/{id}
   * Retorna o artigo completo com conteúdo HTML e artigos relacionados (RB030, RB031).
   */
  getById: async (id: string): Promise<ArticleDetail> => {
    const res = await api.get<ArticleDetail>(`${BASE}/articles/${id}`);
    return res.data;
  },

  /**
   * POST /api/knowledge-base/articles
   * Cria um novo procedimento operacional. Requer role: Editor | Administrator.
   * RB002, RB008-RB012, RB023.
   * O userId é extraído pelo backend via Claims — não enviar no body.
   */
  create: async (data: CreateKnowledgeArticleRequest): Promise<ArticleDetail> => {
    const res = await api.post<ArticleDetail>(`${BASE}/articles`, data);
    return res.data;
  },

  /**
   * PUT /api/knowledge-base/articles
   * ATENÇÃO: SEM {id} na rota — o ID do artigo vem dentro do body (request.Id).
   * Gera uma nova versão do conteúdo (RB004). Nunca sobrescreve versões (RB005).
   * Requer role: Editor | Administrator.
   */
  update: async (data: UpdateKnowledgeArticleRequest): Promise<ArticleDetail> => {
    const res = await api.put<ArticleDetail>(`${BASE}/articles`, data);
    return res.data;
  },

  /**
   * DELETE /api/knowledge-base/articles/{id}
   * Exclusão lógica / Soft Delete (RB006). Requer role: Administrator.
   * O artigo não é removido da base, apenas marcado como deletado.
   * Retorna 204 No Content.
   */
  softDelete: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/articles/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERAÇÕES
// Controller: KnowledgeInteractionsController → Route: api/knowledge-base/interactions
// Todos requerem [Authorize]. O userId é lido do JWT pelo backend via Claims.
// ─────────────────────────────────────────────────────────────────────────────

const interactions = {
  /**
   * POST /api/knowledge-base/interactions/{articleId}/view
   * Regista visualização do artigo pelo utilizador logado.
   * RB015 (histórico de visualizações), RB024 (contador no artigo).
   * Deve ser chamado automaticamente ao montar a ArticleViewPage.
   * Retorna 200 OK sem body estruturado.
   */
  registerView: async (articleId: string): Promise<void> => {
    await api.post(`${BASE}/interactions/${articleId}/view`);
  },

  /**
   * POST /api/knowledge-base/interactions/{articleId}/favorite
   * Toggle de favorito — se já favoritado, desfavorita; caso contrário, favorita.
   * RB014 (favoritos individuais), RB025 (contador de favoritos).
   * Retorna 200 OK sem body estruturado.
   */
  toggleFavorite: async (articleId: string): Promise<void> => {
    await api.post(`${BASE}/interactions/${articleId}/favorite`);
  },

  /**
   * POST /api/knowledge-base/interactions/{articleId}/read
   * Marca o artigo como lido (toggle) pelo utilizador logado.
   * RB032: Read Tracking — OBRIGATÓRIO para o motor de gamificação.
   * RB033: Dispara verificação de conquista de categoria.
   * RB034: Invalida conquista se novo artigo foi publicado na categoria.
   * Retorna 200 OK sem body estruturado.
   */
  markAsRead: async (articleId: string): Promise<void> => {
    await api.post(`${BASE}/interactions/${articleId}/read`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Export principal
// Uso: knowledgeBaseService.articles.search({ searchTerm: 'cisco' })
//      knowledgeBaseService.interactions.markAsRead(articleId)
// ─────────────────────────────────────────────────────────────────────────────

export const knowledgeBaseService = {
  categories,
  tags,
  articles,
  interactions,
} as const;
