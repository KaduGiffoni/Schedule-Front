import { api } from "../../../lib/axios";
import type { ScheduleDay } from "../types";

export const scheduleService = {
  getEscalaGeral: async (ano: number, mes: number): Promise<ScheduleDay[]> => {
    try {
      const response = await api.get<ScheduleDay[]>(
        "api/ScheduleDays/escala-geral",
        {
          params: { ano, mes, apenasFolga: false },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar a escala geral:", error);
      throw error;
    }
  },
};
