import { z } from "zod";
export declare const ZDeleteTeamInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    teamId: number;
}, {
    teamId: number;
}>;
export type TDeleteTeamInputSchema = z.infer<typeof ZDeleteTeamInputSchema>;
