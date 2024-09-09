import { z } from "zod";
export declare const ZDeleteInputSchema: z.ZodObject<{
    groupName: z.ZodString;
    teamId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    groupName: string;
}, {
    teamId: number;
    groupName: string;
}>;
export type ZDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
