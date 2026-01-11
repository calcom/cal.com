export type SlotInfo = {
  time: string;
  attendees?: number;
  bookingUid?: string;
  away?: boolean;
  fromUser?: {
    id: number;
    name: string | null;
    username: string | null;
  };
  toUser?: {
    id: number;
    name: string | null;
    username: string | null;
  };
  reason?: string;
  emoji?: string;
  showNotePublicly?: boolean;
};

export type GetAvailableSlotsResponse = {
  slots: Record<string, SlotInfo[]>;
};
