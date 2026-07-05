import { create } from 'zustand';
import { lettersService, type Letter } from '../api/lettersService';

interface LettersState {
  letters: Letter[];
  isLoaded: boolean;
  isLoading: boolean;
  /** Busca as letras uma única vez e mantém em cache. Re-chamadas são no-op se já carregado. */
  fetchLetters: () => Promise<void>;
}

export const useLettersStore = create<LettersState>()((set, get) => ({
  letters: [],
  isLoaded: false,
  isLoading: false,

  fetchLetters: async () => {
    // Cache simples: se já carregou ou está carregando, não busca de novo
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true });
    try {
      const data = await lettersService.getAll();
      set({ letters: data, isLoaded: true });
    } catch (error) {
      console.error('Erro ao carregar letras/equipes:', error);
      // Em caso de erro, mantém isLoaded=false para permitir retry
    } finally {
      set({ isLoading: false });
    }
  },
}));
