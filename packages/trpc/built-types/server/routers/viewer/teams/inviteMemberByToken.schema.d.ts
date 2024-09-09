import { z } from "zod";
export declare const ZInviteMemberByTokenSchemaInputSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type TInviteMemberByTokenSchemaInputSchema = z.infer<typeof ZInviteMemberByTokenSchemaInputSchema>;
