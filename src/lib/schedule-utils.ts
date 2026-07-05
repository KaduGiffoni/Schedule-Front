/**
 * schedule-utils.ts
 * Constantes e helpers compartilhados para o sistema de escalas.
 * Centraliza dados que estavam duplicados em CalendarGrid e RightSidebarContent.
 */
import type { Letter } from '../features/letters/api/lettersService';

// ── Mapa de IDs de letra para nome da equipe ─────────────────────────────────
/**
 * @deprecated Use `getTeamName(letterId, letters)` com o array dinâmico do lettersStore.
 * Este mapa estático só existe como fallback de emergência.
 */
export const TEAM_MAP: Record<number, string> = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
};

// ── Estilos visuais por turno ─────────────────────────────────────────────────
export interface ShiftStyle {
  /** Rótulo de horário exibido na célula do calendário */
  label: string;
  /** Classes CSS para o badge de horário */
  badge: string;
  /** Classes CSS para o card do turno */
  card: string;
  /** Nome da variável CSS de cor do turno (para uso programático) */
  colorVar: string;
}

export const SHIFT_STYLES: Record<string, ShiftStyle> = {
  Noite: {
    label: "23h → 07h",
    badge: "bg-[var(--color-shift-night-bg)] text-[var(--color-shift-night)]",
    card:  "bg-[var(--color-shift-night-bg)] border-[var(--color-shift-night)]/20",
    colorVar: "--color-shift-night",
  },
  Manha: {
    label: "07h → 15h",
    badge: "bg-[var(--color-shift-morning-bg)] text-[var(--color-shift-morning)]",
    card:  "bg-[var(--color-shift-morning-bg)] border-[var(--color-shift-morning)]/20",
    colorVar: "--color-shift-morning",
  },
  Tarde: {
    label: "15h → 23h",
    badge: "bg-[var(--color-shift-afternoon-bg)] text-[var(--color-shift-afternoon)]",
    card:  "bg-[var(--color-shift-afternoon-bg)] border-[var(--color-shift-afternoon)]/20",
    colorVar: "--color-shift-afternoon",
  },
  Folga: {
    label: "Folga",
    badge: "bg-[var(--color-shift-off-bg)] text-[var(--color-shift-off)]",
    card:  "bg-[var(--color-shift-off-bg)] border-[var(--color-shift-off)]/20",
    colorVar: "--color-shift-off",
  },
};

// ── Ordem de exibição dos turnos ──────────────────────────────────────────────
export const SHIFT_ORDER: Record<string, number> = {
  Noite: 1,
  Manha: 2,
  Tarde: 3,
  Folga: 4,
};

// ── Nomes dos meses em PT-BR ──────────────────────────────────────────────────
export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

// ── Helpers de normalização ───────────────────────────────────────────────────

/**
 * Normaliza o nome de um turno removendo acentos e diacríticos.
 * Ex: "Manhã" → "Manha", "Noite" → "Noite"
 */
export function normalizeShiftName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Extrai o número do dia de uma string de data ISO (ex: "2026-07-03T00:00:00").
 */
export function parseShiftDay(dateStr: string): number {
  return parseInt(dateStr.split("T")[0].split("-")[2], 10);
}

/**
 * Extrai {year, month, day} de uma string de data ISO de forma segura,
 * evitando problemas de fuso horário do `new Date()`.
 */
export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return { year, month, day };
}

/**
 * Retorna o estilo de um turno pelo nome normalizado.
 * Fallback para "Folga" se não encontrado.
 */
export function getShiftStyle(shiftName: string): ShiftStyle {
  const normalized = normalizeShiftName(shiftName);
  return SHIFT_STYLES[normalized] ?? SHIFT_STYLES["Folga"];
}

/**
 * Retorna o nome da equipe a partir do array dinâmico de letras (fonte: GET /api/Letters).
 * Prefira este helper a TEAM_MAP para garantir dados atualizados do backend.
 *
 * @param letterId  - ID da letra/equipe
 * @param letters   - Array de letras vindas do lettersStore
 * @returns         - Nome da equipe (ex: "A") ou "?" se não encontrado
 */
export function getTeamName(letterId: number, letters: Letter[]): string {
  const found = letters.find((l) => l.id === letterId);
  return found?.name ?? TEAM_MAP[letterId] ?? "?";
}
