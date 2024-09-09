import { z } from "zod";
export declare const ZDeleteInviteInputSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type TDeleteInviteInputSchema = z.infer<typeof ZDeleteInviteInputSchema>;
