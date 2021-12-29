import { PartialReference } from "@lib/events/EventManager";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";

type EventBusyDate = Record<"start" | "end", Date>;

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

export interface ZoomToken {
  scope: "meeting:write";
  expiry_date: number;
  expires_in?: number; // deprecated, purely for backwards compatibility; superseeded by expiry_date.
  token_type: "bearer";
  access_token: string;
  refresh_token: string;
}

export interface DailyReturnType {
  /** Long UID string ie: 987b5eb5-d116-4a4e-8e2c-14fcb5710966 */
  id: string;
  /** Not a real name, just a random generated string ie: "ePR84NQ1bPigp79dDezz" */
  name: string;
  api_created: boolean;
  privacy: "private" | "public";
  /** https://api-demo.daily.co/ePR84NQ1bPigp79dDezz */
  url: string;
  created_at: string;
  config: {
    nbf: number;
    exp: number;
    enable_chat: boolean;
    enable_knocking: boolean;
    enable_prejoin_ui: boolean;
    enable_new_call_ui: boolean;
  };
}

export interface DailyEventResult {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: Record<string, unknown>;
}

export interface DailyVideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

export type DailyKey = {
  apikey: string;
};

export interface VideoConferencing {
  createMeeting(event: CalendarEvent): Promise<VideoCallData>;

  updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData>;

  deleteMeeting(uid: string): Promise<unknown>;

  getAvailability(dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]>;
}
