import { api } from "../../../lib/axios";
import type {
  SwapRequest,
  PagedResult,
  CreateSwapRequestDTO,
} from "../types";

export const swapRequestsService = {
  /**
   * POST /api/SwapRequests/create
   * Solicita que targetUserId assuma o turno scheduleDayId do usuário logado.
   * @throws AxiosError 400 com { erro: string } em erros de validação.
   */
  createRequest: async (data: CreateSwapRequestDTO): Promise<{ mensagem: string }> => {
    const response = await api.post<{ mensagem: string }>(
      "/api/SwapRequests/create",
      data,
    );
    return response.data;
  },

  /**
   * GET /api/SwapRequests/pending
   * Lista pedidos pendentes onde o usuário logado é o targetUserId.
   */
  getPending: async (): Promise<SwapRequest[]> => {
    const response = await api.get<SwapRequest[]>("/api/SwapRequests/pending");
    return response.data;
  },

  /**
   * PUT /api/SwapRequests/{id}/respond?accept=true|false
   * Só o targetUserId do pedido pode responder. Retorna 403 se não autorizado.
   */
  respond: async (id: number, accept: boolean): Promise<{ mensagem: string }> => {
    const response = await api.put<{ mensagem: string }>(
      `/api/SwapRequests/${id}/respond`,
      null,
      { params: { accept } },
    );
    return response.data;
  },

  /**
   * GET /api/SwapRequests/history?page=&pageSize=
   * Histórico paginado — inclui pedidos onde o usuário é requesting OU target.
   */
  getHistory: async (
    page = 1,
    pageSize = 10,
  ): Promise<PagedResult<SwapRequest>> => {
    const response = await api.get<PagedResult<SwapRequest>>(
      "/api/SwapRequests/history",
      { params: { page, pageSize } },
    );
    return response.data;
  },
};
