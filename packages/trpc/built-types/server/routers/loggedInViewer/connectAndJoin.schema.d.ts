import { z } from "zod";
export declare const ZConnectAndJoinInputSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type TConnectAndJoinInputSchema = z.infer<typeof ZConnectAndJoinInputSchema>;
