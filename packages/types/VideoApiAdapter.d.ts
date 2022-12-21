import type { EventBusyDate } from "./Calendar";
import { CredentialPayload } from "./Credential";

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

export interface RecordingObj {
  id: string;
  room_name: string;
  start_ts: number;
  status: string;
  max_participants: number;
  duration: number;
  share_token: string;
}

export type GetRecordingsResponse =
  | {
      total_count: number;
      data: RecordingObjType[];
    }
  | Record<string, never>;

// VideoApiAdapter is defined by the Video App. The App currently can choose to not define it. So, consider in type that VideoApiAdapter can be undefined.
export type VideoApiAdapter =
  | {
      createMeeting(event: CalendarEvent): Promise<VideoCallData>;

      updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData>;

      deleteMeeting(uid: string): Promise<unknown>;

      getAvailability(dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]>;

      getRecordings?(roomName: string): Promise<GetRecordingsResponse>;
    }
  | undefined;

export type VideoApiAdapterFactory = (credential: CredentialPayload) => VideoApiAdapter;
