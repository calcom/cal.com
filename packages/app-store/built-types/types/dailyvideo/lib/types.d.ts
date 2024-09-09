import { z } from "zod";
/** @link https://docs.daily.co/reference/rest-api/rooms/create-room */
export declare const dailyReturnTypeSchema: z.ZodObject<{
    /** Long UID string ie: 987b5eb5-d116-4a4e-8e2c-14fcb5710966 */
    id: z.ZodString;
    /** Not a real name, just a random generated string ie: "ePR84NQ1bPigp79dDezz" */
    name: z.ZodString;
    api_created: z.ZodBoolean;
    privacy: z.ZodUnion<[z.ZodLiteral<"private">, z.ZodLiteral<"public">]>;
    /** https://api-demo.daily.co/ePR84NQ1bPigp79dDezz */
    url: z.ZodString;
    created_at: z.ZodString;
    config: z.ZodObject<{
        /** Timestamps expressed in seconds, not in milliseconds */
        nbf: z.ZodOptional<z.ZodNumber>;
        /** Timestamps expressed in seconds, not in milliseconds */
        exp: z.ZodNumber;
        enable_chat: z.ZodBoolean;
        enable_knocking: z.ZodBoolean;
        enable_prejoin_ui: z.ZodBoolean;
        enable_transcription_storage: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        exp: number;
        enable_chat: boolean;
        enable_knocking: boolean;
        enable_prejoin_ui: boolean;
        enable_transcription_storage: boolean;
        nbf?: number | undefined;
    }, {
        exp: number;
        enable_chat: boolean;
        enable_knocking: boolean;
        enable_prejoin_ui: boolean;
        nbf?: number | undefined;
        enable_transcription_storage?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    url: string;
    config: {
        exp: number;
        enable_chat: boolean;
        enable_knocking: boolean;
        enable_prejoin_ui: boolean;
        enable_transcription_storage: boolean;
        nbf?: number | undefined;
    };
    api_created: boolean;
    privacy: "private" | "public";
    created_at: string;
}, {
    id: string;
    name: string;
    url: string;
    config: {
        exp: number;
        enable_chat: boolean;
        enable_knocking: boolean;
        enable_prejoin_ui: boolean;
        nbf?: number | undefined;
        enable_transcription_storage?: boolean | undefined;
    };
    api_created: boolean;
    privacy: "private" | "public";
    created_at: string;
}>;
export declare const getTranscripts: z.ZodObject<{
    total_count: z.ZodNumber;
    data: z.ZodArray<z.ZodObject<{
        transcriptId: z.ZodString;
        domainId: z.ZodString;
        roomId: z.ZodString;
        mtgSessionId: z.ZodString;
        duration: z.ZodNumber;
        status: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: string;
        transcriptId: string;
        domainId: string;
        roomId: string;
        mtgSessionId: string;
        duration: number;
    }, {
        status: string;
        transcriptId: string;
        domainId: string;
        roomId: string;
        mtgSessionId: string;
        duration: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    data: {
        status: string;
        transcriptId: string;
        domainId: string;
        roomId: string;
        mtgSessionId: string;
        duration: number;
    }[];
    total_count: number;
}, {
    data: {
        status: string;
        transcriptId: string;
        domainId: string;
        roomId: string;
        mtgSessionId: string;
        duration: number;
    }[];
    total_count: number;
}>;
export declare const getBatchProcessJobs: z.ZodObject<{
    total_count: z.ZodNumber;
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        preset: z.ZodString;
        status: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        preset: string;
    }, {
        status: string;
        id: string;
        preset: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    data: {
        status: string;
        id: string;
        preset: string;
    }[];
    total_count: number;
}, {
    data: {
        status: string;
        id: string;
        preset: string;
    }[];
    total_count: number;
}>;
export declare const getRooms: z.ZodObject<{
    id: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export declare const meetingTokenSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const ZGetMeetingTokenResponseSchema: z.ZodObject<{
    room_name: z.ZodString;
    exp: z.ZodNumber;
    enable_recording_ui: z.ZodOptional<z.ZodBoolean>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    room_name: z.ZodString;
    exp: z.ZodNumber;
    enable_recording_ui: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    room_name: z.ZodString;
    exp: z.ZodNumber;
    enable_recording_ui: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">>;
//# sourceMappingURL=types.d.ts.map