import { z } from "zod";
export declare const ZRoundRobinReassignInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    bookingId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
    teamId: number;
}, {
    bookingId: number;
    teamId: number;
}>;
export type TRoundRobinReassignInputSchema = z.infer<typeof ZRoundRobinReassignInputSchema>;
