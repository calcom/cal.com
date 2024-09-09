import { z } from "zod";
export declare const ZCreateInputSchema: z.ZodObject<{
    name: z.ZodString;
    teamId: z.ZodNumber;
    directoryId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    teamId: number;
    directoryId: string;
}, {
    name: string;
    teamId: number;
    directoryId: string;
}>;
export type ZCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
