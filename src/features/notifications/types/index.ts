export interface Notification {
  id: number;
  message: string;
  /** Tipo semântico da notificação, ex: "ShiftHandover", "Absence", "General" */
  type: string;
  /** Se preenchido, indica o Notice relacionado — usado para navegar para /comunicacao?noticeId=X */
  referenceNoticeId: number | null;
  isRead: boolean;
  createdAt: string; // ISO date
}
