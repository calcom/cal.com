import { z } from "zod";
export declare const ZGetDownloadLinkOfCalVideoRecordingsInputSchema: z.ZodObject<{
    recordingId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    recordingId: string;
}, {
    recordingId: string;
}>;
export type TGetDownloadLinkOfCalVideoRecordingsInputSchema = z.infer<typeof ZGetDownloadLinkOfCalVideoRecordingsInputSchema>;
