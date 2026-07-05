/** Ausência de um colaborador em um dia específico da escala */
export interface AbsenceOnDay {
  absenceId: number;
  userId: string;
  userName: string;
  type: number;
  typeDescription: string;
  substituteUserId: string | null;
  substituteUserName: string | null;
}

export interface ScheduleDay {
  id: number;
  date: string;
  letterId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  isDayOff: boolean;
  isSwapped: boolean;
  swappedWithUserName: string | null;
  swappedWithUserId: string | null;
  /** Indica se há pelo menos uma ausência registrada neste dia */
  hasAbsence: boolean;
  /** Lista de ausências do dia (pode ser vazia se hasAbsence=false) */
  absences: AbsenceOnDay[];
}

