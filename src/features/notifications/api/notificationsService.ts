import { api } from "../../../lib/axios";
import type { Notification } from "../types";

export const notificationsService = {
  /**
   * GET /api/notifications
   * GET /api/notifications?onlyUnread=true  — só as não lidas
   */
  // FIX: 6 — AbortSignal repassado ao Axios
  getNotifications: async (
    signalOrOptions?: AbortSignal | { onlyUnread?: boolean },
    signal?: AbortSignal
  ): Promise<Notification[]> => {
    const isSignal = signalOrOptions instanceof AbortSignal;
    const actualSignal = isSignal ? signalOrOptions : signal;
    const options = isSignal ? undefined : signalOrOptions;

    const params = options?.onlyUnread ? { onlyUnread: true } : undefined;
    const response = await api.get<Notification[]>("/api/notifications", {
      params,
      signal: actualSignal,
    });
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
