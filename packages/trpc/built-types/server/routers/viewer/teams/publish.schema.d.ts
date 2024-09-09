import { z } from "zod";
export declare const ZPublishInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    teamId: number;
}, {
    teamId: number;
}>;
export type TPublishInputSchema = z.infer<typeof ZPublishInputSchema>;
