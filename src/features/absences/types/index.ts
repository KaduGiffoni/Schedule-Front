/** Tipos de ausência (espelha o backend) */
export const AbsenceType = {
  Ferias:          0,
  CompensacaoHora: 1,
  Atestado:        2,
  Falta:           3,
  Outro:           4,
} as const;

export type AbsenceTypeValue = typeof AbsenceType[keyof typeof AbsenceType];

export const ABSENCE_TYPE_LABELS: Record<number, string> = {
  [AbsenceType.Ferias]: "Férias",
  [AbsenceType.CompensacaoHora]: "Compensação de Hora",
  [AbsenceType.Atestado]: "Atestado",
  [AbsenceType.Falta]: "Falta",
  [AbsenceType.Outro]: "Outro",
};

export interface AbsenceResponseDTO {
  id: number;
  userId: string;
  userName: string;
  type: number;
  /** Já vem traduzido pelo backend: "Férias", "Compensação de Hora", etc. */
  typeDescription: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  substituteUserId: string | null;
  substituteUserName: string | null;
  notes: string | null;
}

export interface CreateAbsenceDTO {
  startDate: string;
  endDate: string;
  type: number;
  /** Opcional. Só Admin/Manager podem informar userId diferente do próprio. */
  targetUserId?: string;
  /** Opcional. Quem vai cobrir o turno. */
  substituteUserId?: string;
  notes?: string;
}

export interface CreateAbsenceResponse {
  mensagem: string;
  id: number;
}
