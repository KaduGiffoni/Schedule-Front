export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  createdByUserName: string;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  type: "Geral" | "Turno";
  /** Backend usa apenas "Ativo" | "Resolvido" — nunca "Encerrado" */
  status: "Ativo" | "Resolvido";
  createdAt: string;
  createdByUserName: string;
  comments: Comment[];
}

export interface CreateNoticeDTO {
  title: string;
  content: string;
  type: "Geral" | "Turno";
}