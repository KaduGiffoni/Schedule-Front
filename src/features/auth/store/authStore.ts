import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types';

interface AuthState {
  token: string | null;
  email: string | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  
  // 👇 Aqui está a função nova que o LoginPage precisa!
  setTokenAndEmail: (token: string, email: string) => void;
  setUserProfile: (profile: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      userProfile: null,
      isAuthenticated: false,
      
      // 👇 E aqui está o que ela faz
      setTokenAndEmail: (token, email) => set({ token, email, isAuthenticated: true }),
      
      setUserProfile: (userProfile) => set({ userProfile }),
      
      logout: () => set({ token: null, email: null, userProfile: null, isAuthenticated: false }),
    }),
    {
      name: '@WorkforcePro:auth',
    }
  )
);