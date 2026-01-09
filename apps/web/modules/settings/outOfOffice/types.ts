export type BookingRedirectForm = {
  dateRange: { startDate: Date; endDate: Date };
  startDateOffset: number;
  endDateOffset: number;
  toTeamUserId: number | null;
  reasonId: number;
  notes?: string;
  showNotePublicly?: boolean;
  uuid?: string | null;
  forUserId: number | null;
  forUserName?: string;
  forUserAvatar?: string;
  toUserName?: string;
};
