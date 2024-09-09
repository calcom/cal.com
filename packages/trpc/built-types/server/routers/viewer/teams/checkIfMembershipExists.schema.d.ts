import { z } from "zod";
export declare const ZCheckIfMembershipExistsInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    teamId: number;
}, {
    value: string;
    teamId: number;
}>;
export type TCheckIfMembershipExistsInputSchema = z.infer<typeof ZCheckIfMembershipExistsInputSchema>;
