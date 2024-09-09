import { z } from "zod";
export declare const ZMeInputSchema: z.ZodOptional<z.ZodObject<{
    includePasswordAdded: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includePasswordAdded?: boolean | undefined;
}, {
    includePasswordAdded?: boolean | undefined;
}>>;
export type TMeInputSchema = z.infer<typeof ZMeInputSchema>;
