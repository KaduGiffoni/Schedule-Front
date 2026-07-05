import { api } from "../../../lib/axios";
import type { CreateNoticeDTO, Notice } from "../types";

export const noticesService = {
  /**
   * GET /api/Notices/my-board
   * Retorna um array puro de Notice[] (NÃO um wrapper { needsSync, data, ... }).
   */
  getMyBoard: async (): Promise<Notice[]> => {
    const response = await api.get<Notice[]>("/api/Notices/my-board");
    return response.data;
  },

  acknowledgeNotice: async (id: number): Promise<void> => {
    await api.post(`/api/Notices/${id}/acknowledge`);
  },

  addComment: async (id: number, content: string): Promise<void> => {
    await api.post(`/api/Notices/${id}/comments`, { content });
  },

  createNotice: async (data: CreateNoticeDTO): Promise<Notice> => {
    const response = await api.post<Notice>("/api/Notices", data);
    return response.data;
  },
};

