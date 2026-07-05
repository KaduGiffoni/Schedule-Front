// ── Re-export para conveniência ────────────────────────────────────────────────
export type { Letter } from "../../letters/api/lettersService";

// ── Company ───────────────────────────────────────────────────────────────────
export interface Company {
  id: number;
  name: string;
  isOutsource: boolean;
  sectors?: Sector[];
}

export interface CreateCompanyDTO {
  name: string;
  isOutsource: boolean;
}

// ── Sector ────────────────────────────────────────────────────────────────────
export interface Sector {
  id: number;
  name: string;
  companyId: number;
  defaultShiftPatternId?: number | null;
  letters?: import("../../letters/api/lettersService").Letter[];
}

export interface CreateSectorDTO {
  name: string;
  companyId: number;
  defaultShiftPatternId?: number | null;
}

// ── Letter (CRUD Admin/Manager) ───────────────────────────────────────────────
export interface CreateLetterDTO {
  name: string;
  sectorId: number;
  patternOffset: number;
}

export interface UpdateLetterDTO {
  name: string;
  sectorId: number;
  patternOffset: number;
}

// ── Shift ─────────────────────────────────────────────────────────────────────
export interface Shift {
  id: number;
  name: string;
  startTime: string;   // "HH:mm" ou "HH:mm:ss"
  endTime: string;
  isDayOff: boolean;
}

export interface CreateShiftDTO {
  name: string;
  startTime: string;
  endTime: string;
  isDayOff: boolean;
}

// ── ShiftPattern ──────────────────────────────────────────────────────────────
export interface ShiftPattern {
  id: number;
  name?: string;
  /** IDs de Shift separados por vírgula, ex: "1,2,3,4" */
  sequence: string;
}

export interface CreateShiftPatternDTO {
  name?: string;
  sequence: string;
}

// ── Generate Rotation ─────────────────────────────────────────────────────────
export interface GenerateRotationDTO {
  startDate: string;
  endDate: string;
  sectorId: number;
  shiftPatternId: number;
}

// ── Promote User ──────────────────────────────────────────────────────────────
export interface PromoteUserParams {
  email: string;
  cargo: string;
}
