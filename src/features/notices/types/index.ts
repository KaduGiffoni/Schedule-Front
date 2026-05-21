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
  status: "Ativo" | "Encerrado";
  createdAt: string;
  createdByUserName: string;
  comments: Comment[];
}

export interface NoticeBoardResponse {
  needsSync: boolean;
  currentYear: number;
  data: Notice[];
}

export interface CreateNoticeDTO {
  title: string;
  content: string;
  type: "Geral" | "Turno";
}