import { z } from "zod";
export declare const ZListInputSchema: z.ZodOptional<z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
    userId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    teamId?: number | undefined;
    userId?: number | undefined;
}, {
    teamId?: number | undefined;
    userId?: number | undefined;
}>>;
export type TListInputSchema = z.infer<typeof ZListInputSchema>;
