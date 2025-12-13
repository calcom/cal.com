import type { Prisma } from "@calcom/prisma/client";

export interface OneOffMeetingSlot {
  id: string;
  startTime: Date;
  endTime: Date;
}

export interface OneOffMeetingUser {
  id: number;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  timeZone: string;
  weekStart: string;
  hideBranding?: boolean;
  theme?: string | null;
}

export interface OneOffMeetingData {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  location: Prisma.JsonValue;
  timeZone: string;
  linkHash: string;
  status: string;
  offeredSlots: OneOffMeetingSlot[];
  user: OneOffMeetingUser;
  error?: string | null;
}

