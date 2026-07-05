export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface UserProfile {
  userId: string;
  user: string;
  letterId: number;
  completeName: string;
  surname?: string;
  registration: string;
  /** Role do usuário: "Admin" | "Manager" | "Standard" | "Viewer" */
  role?: string;
}