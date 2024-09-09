import { z } from "zod";
export declare const ZGetMembershipbyUserInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    memberId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    memberId: number;
}, {
    teamId: number;
    memberId: number;
}>;
export type TGetMembershipbyUserInputSchema = z.infer<typeof ZGetMembershipbyUserInputSchema>;
