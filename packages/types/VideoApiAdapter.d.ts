import type {
  TSubmitBatchProcessorJobRes,
  batchProcessorBody,
  TGetTranscriptAccessLink,
} from "@calcom/app-store/dailyvideo/zod";
import type { GetRecordingsResponseSchema, GetAccessLinkResponseSchema } from "@calcom/prisma/zod-utils";

import type { EventBusyDate } from "./Calendar";
import type { CredentialPayload } from "./Credential";

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

// VideoApiAdapter is defined by the Video App. The App currently can choose to not define it. So, consider in type that VideoApiAdapter can be undefined.
export type VideoApiAdapter =
  | {
      createMeeting(event: CalendarEvent): Promise<VideoCallData>;

      updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData>;

      deleteMeeting(uid: string): Promise<unknown>;

      getAvailability(dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]>;

      getRecordings?(roomName: string): Promise<GetRecordingsResponseSchema>;

      getRecordingDownloadLink?(recordingId: string): Promise<GetAccessLinkResponseSchema>;

      createInstantCalVideoRoom?(endTime: string): Promise<VideoCallData>;

      getAllTranscriptsAccessLinkFromRoomName?(roomName: string): Promise<Array<string>>;

      submitBatchProcessorJob?(body: batchProcessorBody): Promise<TSubmitBatchProcessorJobRes>;

      getTranscriptsAccessLinkFromRecordingId?(
        recordingId: string
      ): Promise<TGetTranscriptAccessLink["transcription"] | { message: string }>;

      checkIfRoomNameMatchesInRecording?(roomName: string, recordingId: string): Promise<boolean>;
    }
  | undefined;

export type VideoApiAdapterFactory = (credential: CredentialPayload) => VideoApiAdapter;
