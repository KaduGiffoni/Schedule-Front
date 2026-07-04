/**
 * theme.ts
 * Sistema de temas dark/light com Zustand + persistência em localStorage.
 * Sincroniza com a classe .dark no <html> sem causar flickering.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** Aplica ou remove a classe .dark no elemento <html> */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Dark mode como padrão operacional para NOC (ambiente 24/7)
      theme: "dark",

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: "noc-pro:theme",
      // Sincroniza com o DOM sempre que o store é hidratado do localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

/**
 * Hook de conveniência para consumir o tema atual e a função de toggle.
 */
export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore();

  // Garante sincronização inicial (caso o script anti-flicker já tenha aplicado)
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, setTheme, toggleTheme, isDark: theme === "dark" };
}
