import { api } from "../../../lib/axios";
import type { AbsenceResponseDTO, CreateAbsenceDTO, CreateAbsenceResponse } from "../types";

export const absencesService = {
  /**
   * GET /api/Absences
   * Retorna todas as ausências do mês atual em diante (visão de painel).
   */
  getAll: async (): Promise<AbsenceResponseDTO[]> => {
    const response = await api.get<AbsenceResponseDTO[]>("/api/Absences");
    return response.data;
  },

  /**
   * POST /api/Absences
   * Cria uma nova ausência.
   * @throws AxiosError com status 403 se o usuário não tiver permissão para targetUserId.
   * @throws AxiosError com status 400 se a validação falhar.
   */
  create: async (data: CreateAbsenceDTO): Promise<CreateAbsenceResponse> => {
    const response = await api.post<CreateAbsenceResponse>("/api/Absences", data);
    return response.data;
  },

  /**
   * DELETE /api/Absences/{id}
   * Remove uma ausência. Apenas o dono ou Admin/Manager podem apagar.
   * @throws AxiosError com status 403 se não autorizado.
   * @throws AxiosError com status 404 se não encontrado.
   */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/Absences/${id}`);
  },
};
