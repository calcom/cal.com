import type { IFromUser, IToUser } from "@calcom/features/availability/lib/getUserAvailability";

export type SlotInfo = {
  time: string;
  userIds?: number[];
  away?: boolean;
  fromUser?: IFromUser;
  toUser?: IToUser;
  reason?: string;
  emoji?: string;
  showNotePublicly?: boolean;
};

export type Slots = Record<string, SlotInfo[]>;
