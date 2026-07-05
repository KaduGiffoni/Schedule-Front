import { api } from "../../../lib/axios";
import type {
  Company, CreateCompanyDTO,
  Sector, CreateSectorDTO,
  CreateLetterDTO, UpdateLetterDTO,
  Shift, CreateShiftDTO,
  ShiftPattern, CreateShiftPatternDTO,
  GenerateRotationDTO,
  PromoteUserParams,
} from "../types";
import type { Letter } from "../../letters/api/lettersService";

export const adminService = {
  // ── Companies ──────────────────────────────────────────────────────────────
  getCompanies: async (): Promise<Company[]> => {
    const res = await api.get<Company[]>("/api/Companies");
    return res.data;
  },
  createCompany: async (data: CreateCompanyDTO): Promise<Company> => {
    const res = await api.post<Company>("/api/Companies", data);
    return res.data;
  },

  // ── Sectors ────────────────────────────────────────────────────────────────
  getSectors: async (): Promise<Sector[]> => {
    const res = await api.get<Sector[]>("/api/Sectors");
    return res.data;
  },
  createSector: async (data: CreateSectorDTO): Promise<Sector> => {
    const res = await api.post<Sector>("/api/Sectors", data);
    return res.data;
  },

  // ── Letters (Admin/Manager CRUD) ───────────────────────────────────────────
  getLetters: async (): Promise<Letter[]> => {
    const res = await api.get<Letter[]>("/api/Letters");
    return res.data;
  },
  createLetter: async (data: CreateLetterDTO): Promise<Letter> => {
    const res = await api.post<Letter>("/api/Letters", data);
    return res.data;
  },
  updateLetter: async (id: number, data: UpdateLetterDTO): Promise<Letter> => {
    const res = await api.put<Letter>(`/api/Letters/${id}`, data);
    return res.data;
  },

  // ── Shifts ─────────────────────────────────────────────────────────────────
  getShifts: async (): Promise<Shift[]> => {
    const res = await api.get<Shift[]>("/api/Shift");
    return res.data;
  },
  createShift: async (data: CreateShiftDTO): Promise<Shift> => {
    const res = await api.post<Shift>("/api/Shift", data);
    return res.data;
  },

  // ── ShiftPatterns ──────────────────────────────────────────────────────────
  getShiftPatterns: async (): Promise<ShiftPattern[]> => {
    const res = await api.get<ShiftPattern[]>("/api/ShiftPatterns");
    return res.data;
  },
  createShiftPattern: async (data: CreateShiftPatternDTO): Promise<ShiftPattern> => {
    const res = await api.post<ShiftPattern>("/api/ShiftPatterns", data);
    return res.data;
  },

  // ── Generate Rotation ──────────────────────────────────────────────────────
  generateRotation: async (data: GenerateRotationDTO): Promise<{ mensagem: string }> => {
    const res = await api.post<{ mensagem: string }>(
      "/api/ScheduleDays/generate-rotation",
      data,
    );
    return res.data;
  },

  // ── Reset Escala ───────────────────────────────────────────────────────────
  resetEscala: async (): Promise<{ mensagem: string }> => {
    const res = await api.delete<{ mensagem: string }>(
      "/api/ScheduleDays/reset-escala",
    );
    return res.data;
  },

  // ── User Promotion ─────────────────────────────────────────────────────────
  listCargos: async (): Promise<string[]> => {
    const res = await api.get<string[]>("/api/Auth/listar-cargos");
    return res.data;
  },
  promoteUser: async (params: PromoteUserParams): Promise<{ mensagem: string }> => {
    const res = await api.post<{ mensagem: string }>(
      "/api/Auth/user-promoter",
      null,
      { params: { email: params.email, cargo: params.cargo } },
    );
    return res.data;
  },
};
