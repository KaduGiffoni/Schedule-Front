import { api } from "../../../lib/axios";

export interface ChangePasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}

// ... dentro do export const usersService = {
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

  getUserByEmail: async (email: string): Promise<User> => {
    const response = await api.get("/api/Users/get-user", {
      params: { email },
    });
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<any> => {
    const response = await api.put("/api/Users/change-password", data);
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<any> => {
    const response = await api.put("/api/Users/link-profile", data);
    return response.data;
  },

  // TODO: Reativar quando o backend expor o endpoint de exclusão de usuários.
  // O endpoint DELETE /api/Users/{email} (ou similar) ainda não existe no Schedule-BackEnd.
  // deleteUser: async (email: string): Promise<any> => { ... }
};
