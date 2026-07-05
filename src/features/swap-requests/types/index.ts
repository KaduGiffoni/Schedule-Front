/** Status numérico do pedido de troca (espelha o backend) */
export const SwapStatus = {
  Pending:  0,
  Approved: 1,
  Rejected: 2,
} as const;

export type SwapStatusType = typeof SwapStatus[keyof typeof SwapStatus];

export const SWAP_STATUS_LABELS: Record<number, string> = {
  [SwapStatus.Pending]:  "Pendente",
  [SwapStatus.Approved]: "Aprovado",
  [SwapStatus.Rejected]: "Recusado",
};

/** Shape do usuário de navegação dentro do SwapRequest */
export interface SwapUser {
  userName?: string;
  completeName?: string;
}

/** Shape do dia de escala de navegação dentro do SwapRequest */
export interface SwapScheduleDay {
  id: number;
  date?: string;
  letterId?: number;
  shiftId?: number;
  shift?: { name?: string; startTime?: string; endTime?: string } | null;
}

/**
 * SwapRequest — shape RAW do backend (GET /pending e GET /history).
 * Campos de navegação são potencialmente null — use optional chaining.
 */
export interface SwapRequest {
  id: number;
  requestingUserId: string;
  requestingUser: SwapUser | null;
  targetUserId: string;
  targetUser: SwapUser | null;
  scheduleDayId: number;
  scheduleDay: SwapScheduleDay | null;
  /** 0=Pending, 1=Approved, 2=Rejected */
  status: number;
  createdAt: string;
}

/** Resultado paginado de GET /history */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

/** Body de POST /create */
export interface CreateSwapRequestDTO {
  targetUserId: string;
  scheduleDayId: number;
}
