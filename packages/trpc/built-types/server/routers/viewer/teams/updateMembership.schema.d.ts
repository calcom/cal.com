import { z } from "zod";
export declare const ZUpdateMembershipInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    memberId: z.ZodNumber;
    disableImpersonation: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    disableImpersonation: boolean;
    memberId: number;
}, {
    teamId: number;
    disableImpersonation: boolean;
    memberId: number;
}>;
export type TUpdateMembershipInputSchema = z.infer<typeof ZUpdateMembershipInputSchema>;
