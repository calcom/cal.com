import { z } from "zod";
export declare const ZCreateInputSchema: z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    teamId?: number | undefined;
}, {
    teamId?: number | undefined;
}>;
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
