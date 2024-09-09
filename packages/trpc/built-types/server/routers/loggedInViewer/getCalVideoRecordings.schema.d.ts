import { z } from "zod";
export declare const ZGetCalVideoRecordingsInputSchema: z.ZodObject<{
    roomName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomName: string;
}, {
    roomName: string;
}>;
export type TGetCalVideoRecordingsInputSchema = z.infer<typeof ZGetCalVideoRecordingsInputSchema>;
