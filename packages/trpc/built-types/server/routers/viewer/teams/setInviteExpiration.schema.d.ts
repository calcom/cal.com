import { z } from "zod";
export declare const ZSetInviteExpirationInputSchema: z.ZodObject<{
    token: z.ZodString;
    expiresInDays: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    token: string;
    expiresInDays?: number | undefined;
}, {
    token: string;
    expiresInDays?: number | undefined;
}>;
export type TSetInviteExpirationInputSchema = z.infer<typeof ZSetInviteExpirationInputSchema>;
