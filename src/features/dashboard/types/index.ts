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
}

