import { z } from "zod";
export declare const ZResendInvitationInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    email: z.ZodString;
    language: z.ZodString;
    isOrg: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    teamId: number;
    language: string;
    isOrg: boolean;
}, {
    email: string;
    teamId: number;
    language: string;
    isOrg?: boolean | undefined;
}>;
export type TResendInvitationInputSchema = z.infer<typeof ZResendInvitationInputSchema>;
