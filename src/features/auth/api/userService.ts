import { api } from "../../../lib/axios";
import type { UserProfile } from "../types";

export const userService = {
  // Chamada GET para /api/Users/get-user?email=...
  getUserProfile: async (email: string): Promise<UserProfile> => {
    try {
      // Ajuste 'Users' para o nome exato da sua rota base, se for diferente de [Route("api/[controller]")]
      const response = await api.get<UserProfile>(`api/Users/get-user`, {
        params: { email }, // O Axios transforma isto em ?email=seu@email.com
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar perfil do utilizador:", error);
      throw error;
    }
  },
};
