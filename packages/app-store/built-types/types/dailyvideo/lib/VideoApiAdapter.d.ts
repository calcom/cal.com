import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoApiAdapter } from "@calcom/types/VideoApiAdapter";
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
/** @deprecated use metadata on index file */
export declare const FAKE_DAILY_CREDENTIAL: CredentialPayload & {
    invalid: boolean;
};
export declare const fetcher: (endpoint: string, init?: RequestInit | undefined) => Promise<unknown>;
export declare const getBatchProcessorJobAccessLink: (id: string) => Promise<{
    status: string;
    id: string;
    preset: string;
    transcription: {
        format: string;
        link: string;
    }[];
}>;
export declare const getRoomNameFromRecordingId: (recordingId: string) => Promise<string>;
export declare const generateGuestMeetingTokenFromOwnerMeetingToken: (meetingToken: string | null) => Promise<string | null>;
export declare const setEnableRecordingUIForOrganizer: (bookingReferenceId: number, meetingToken: string | null) => Promise<string | null>;
declare const DailyVideoApiAdapter: () => VideoApiAdapter;
export default DailyVideoApiAdapter;
//# sourceMappingURL=VideoApiAdapter.d.ts.map