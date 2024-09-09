import { z } from "zod";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoApiAdapter } from "@calcom/types/VideoApiAdapter";
/** @link https://developer.webex.com/docs/meetings **/
declare const webexEventResultSchema: z.ZodObject<{
    id: z.ZodString;
    webLink: z.ZodString;
    siteUrl: z.ZodString;
    password: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    password: string;
    webLink: string;
    siteUrl: string;
}, {
    id: string;
    webLink: string;
    siteUrl: string;
    password?: string | undefined;
}>;
export type WebexEventResult = z.infer<typeof webexEventResultSchema>;
/** @link https://developer.webex.com/docs/api/v1/meetings/create-a-meeting */
export declare const webexMeetingSchema: z.ZodObject<{
    start: z.ZodDate;
    end: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    end: Date;
    start: Date;
}, {
    end: Date;
    start: Date;
}>;
/** @link https://developer.webex.com/docs/api/v1/meetings/list-meetings */
export declare const webexMeetingsSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        start: z.ZodDate;
        end: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        end: Date;
        start: Date;
    }, {
        end: Date;
        start: Date;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        end: Date;
        start: Date;
    }[];
}, {
    items: {
        end: Date;
        start: Date;
    }[];
}>;
declare const WebexVideoApiAdapter: (credential: CredentialPayload) => VideoApiAdapter;
export default WebexVideoApiAdapter;
//# sourceMappingURL=VideoApiAdapter.d.ts.map