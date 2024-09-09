import { z } from "zod";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoApiAdapter } from "@calcom/types/VideoApiAdapter";
/** @link https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate */
declare const zoomEventResultSchema: z.ZodObject<{
    id: z.ZodNumber;
    join_url: z.ZodString;
    password: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: number;
    password: string;
    join_url: string;
}, {
    id: number;
    join_url: string;
    password?: string | undefined;
}>;
export type ZoomEventResult = z.infer<typeof zoomEventResultSchema>;
/** @link https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/meetings */
export declare const zoomMeetingsSchema: z.ZodObject<{
    next_page_token: z.ZodString;
    page_count: z.ZodNumber;
    page_number: z.ZodNumber;
    page_size: z.ZodNumber;
    total_records: z.ZodNumber;
    meetings: z.ZodArray<z.ZodObject<{
        agenda: z.ZodString;
        created_at: z.ZodString;
        duration: z.ZodNumber;
        host_id: z.ZodString;
        id: z.ZodNumber;
        join_url: z.ZodString;
        pmi: z.ZodString;
        start_time: z.ZodString;
        timezone: z.ZodString;
        topic: z.ZodString;
        type: z.ZodNumber;
        uuid: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: number;
        id: number;
        timezone: string;
        uuid: string;
        created_at: string;
        duration: number;
        join_url: string;
        agenda: string;
        host_id: string;
        pmi: string;
        start_time: string;
        topic: string;
    }, {
        type: number;
        id: number;
        timezone: string;
        uuid: string;
        created_at: string;
        duration: number;
        join_url: string;
        agenda: string;
        host_id: string;
        pmi: string;
        start_time: string;
        topic: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    meetings: {
        type: number;
        id: number;
        timezone: string;
        uuid: string;
        created_at: string;
        duration: number;
        join_url: string;
        agenda: string;
        host_id: string;
        pmi: string;
        start_time: string;
        topic: string;
    }[];
    next_page_token: string;
    page_count: number;
    page_number: number;
    page_size: number;
    total_records: number;
}, {
    meetings: {
        type: number;
        id: number;
        timezone: string;
        uuid: string;
        created_at: string;
        duration: number;
        join_url: string;
        agenda: string;
        host_id: string;
        pmi: string;
        start_time: string;
        topic: string;
    }[];
    next_page_token: string;
    page_count: number;
    page_number: number;
    page_size: number;
    total_records: number;
}>;
export type ZoomUserSettings = z.infer<typeof zoomUserSettingsSchema>;
/** @link https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userSettings */
export declare const zoomUserSettingsSchema: z.ZodObject<{
    recording: z.ZodObject<{
        auto_recording: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        auto_recording: string;
    }, {
        auto_recording: string;
    }>;
    schedule_meeting: z.ZodObject<{
        default_password_for_scheduled_meetings: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        default_password_for_scheduled_meetings: string;
    }, {
        default_password_for_scheduled_meetings: string;
    }>;
}, "strip", z.ZodTypeAny, {
    recording: {
        auto_recording: string;
    };
    schedule_meeting: {
        default_password_for_scheduled_meetings: string;
    };
}, {
    recording: {
        auto_recording: string;
    };
    schedule_meeting: {
        default_password_for_scheduled_meetings: string;
    };
}>;
declare const ZoomVideoApiAdapter: (credential: CredentialPayload) => VideoApiAdapter;
export default ZoomVideoApiAdapter;
//# sourceMappingURL=VideoApiAdapter.d.ts.map