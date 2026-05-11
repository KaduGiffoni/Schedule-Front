import { api } from "../../../lib/axios";
import type { LoginRequest, AuthResponse } from "../types";

export const authService = {
  // A função que é chamada quando clicamos no botão "Sign In"
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      // Fazemos um POST para a rota de login do seu C#
      // Nota: Ajuste a rota '/Auth/login' caso a sua API C# use um caminho diferente (ex: '/api/Users/login')
      const response = await api.post<AuthResponse>("/login", credentials);

      // Devolvemos apenas os dados que importam (o Token, etc.) para a LoginPage
      return response.data;
    } catch (error) {
      console.error("Erro no serviço de autenticação:", error);
      throw error; // Lançamos o erro para a LoginPage poder mostrar a mensagem vermelha
    }
  },

  register: async (credentials: LoginRequest): Promise<void> => {
    try {
      // Ajuste a rota '/Auth/register' conforme o seu backend C#
      await api.post("/register", credentials);
    } catch (error) {
      console.error("Erro ao registrar novo utilizador:", error);
      throw error;
    }
  },
};
