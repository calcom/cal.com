import { z } from "zod";
export declare const ZAcceptOrLeaveInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    accept: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    accept: boolean;
}, {
    teamId: number;
    accept: boolean;
}>;
export type TAcceptOrLeaveInputSchema = z.infer<typeof ZAcceptOrLeaveInputSchema>;
