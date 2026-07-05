import { api } from "../../../lib/axios";

export interface Letter {
  id: number;
  name: string;
  sectorId: number;
  patternOffset: number;
}

export const lettersService = {
  /**
   * GET /api/Letters
   * Retorna todas as letras (equipes) cadastradas no backend.
   */
  getAll: async (): Promise<Letter[]> => {
    const response = await api.get<Letter[]>("/api/Letters");
    return response.data;
  },
};
