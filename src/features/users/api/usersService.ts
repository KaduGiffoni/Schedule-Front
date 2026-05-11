import { api } from "../../../lib/axios";

export interface User {
  userId: string;
  user: string; // No seu C#, o 'User' armazena o Email
  letterId: number | null;
  completeName: string;
  surname: string;
  registration: string;
}

export interface UpdateProfileRequest {
  email: string;
  completeName: string;
  surname: string;
  registration: string;
  letterId: number | null; 
}

export const usersService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>("/api/Users/get-all-users");
    return response.data;
  },
  
  

  updateProfile: async (data: UpdateProfileRequest): Promise<any> => {
    const response = await api.put("/api/Users/link-profile", data);
    return response.data;
  },

  deleteUser: async (email: string): Promise<any> => {
    try {
      // O Axios pega no "params" e constrói o link perfeitamente codificado
      const response = await api.delete("/Users/delete-user", {
        params: { email: email },
      });

      // Se devolver 204, o response.data é vazio, logo enviamos um sucesso manual
      return response.data || { success: true };
    } catch (error) {
      console.error("Erro no serviço ao deletar usuário:", error);
      throw error;
    }
  },
};
