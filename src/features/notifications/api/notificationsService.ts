import { api } from "../../../lib/axios";
import type { Notification } from "../types";

export const notificationsService = {
  /**
   * GET /api/notifications
   * GET /api/notifications?onlyUnread=true  — só as não lidas
   */
  getNotifications: async (options?: { onlyUnread?: boolean }): Promise<Notification[]> => {
    const params = options?.onlyUnread ? { onlyUnread: true } : undefined;
    const response = await api.get<Notification[]>("/api/notifications", { params });
    return response.data;
  },

  /**
   * PUT /api/notifications/{id}/read
   * Marca uma notificação como lida.
   */
  markAsRead: async (id: number): Promise<void> => {
    await api.put(`/api/notifications/${id}/read`);
  },

  /**
   * PUT /api/notifications/read-all
   * Marca todas as notificações do usuário como lidas.
   */
  markAllRead: async (): Promise<void> => {
    await api.put("/api/notifications/read-all");
  },
};
