import { z } from "zod";
export declare const ZLocationOptionsInputSchema: z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    teamId?: number | undefined;
}, {
    teamId?: number | undefined;
}>;
export type TLocationOptionsInputSchema = z.infer<typeof ZLocationOptionsInputSchema>;
