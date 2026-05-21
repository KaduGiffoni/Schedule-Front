import { api } from "../../../lib/axios";
import type { NoticeBoardResponse, CreateNoticeDTO, Notice } from "../types";

export const noticesService = {
  getMyBoard: async (): Promise<NoticeBoardResponse> => {
    const response = await api.get<NoticeBoardResponse>(
      "/api/Notices/my-board",
    );
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

  syncHolidays: async (year: number): Promise<void> => {
    await api.post(`/api/Holidays/sync/${year}`);
  },
};
