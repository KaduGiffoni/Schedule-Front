import { api } from "../../../lib/axios";

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string;
  isRecurring: boolean; // 👇 Adicionado
}

export interface HolidayFormDTO {
  name: string;
  date: string;
  type: string;
  isRecurring: boolean; // 👇 Adicionado
}

// 👇 Nova interface para o wrapper que o C# agora retorna
export interface HolidayResponse {
  needsSync: boolean;
  currentYear: number;
  data: Holiday[];
}

export const holidayService = {
  // 👇 Agora retorna a nova interface
  getAll: async (): Promise<HolidayResponse> => {
    const response = await api.get<HolidayResponse>("/api/Holidays");
    return response.data;
  },

  syncHolidays: async (year: number): Promise<any> => {
    const response = await api.post(`/api/Holidays/sync/${year}`);
    return response.data;
  },

  createHoliday: async (data: HolidayFormDTO): Promise<Holiday> => {
    const response = await api.post("/api/Holidays", data);
    return response.data;
  },

  updateHoliday: async (id: number, data: HolidayFormDTO): Promise<any> => {
    const response = await api.put(`/api/Holidays/${id}`, data);
    return response.data;
  },
};
