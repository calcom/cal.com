import type { Credential } from "@prisma/client";

import type { EventBusyDate } from "./Calendar";

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

export interface VideoApiAdapter {
  createMeeting(event: CalendarEvent): Promise<VideoCallData>;

  updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData>;

  deleteMeeting(uid: string): Promise<unknown>;

  getAvailability(dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]>;
}

export type VideoApiAdapterFactory = (credential: Credential) => VideoApiAdapter;
