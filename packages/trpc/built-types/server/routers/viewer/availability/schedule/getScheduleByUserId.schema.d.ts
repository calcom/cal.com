import { z } from "zod";
export declare const ZGetByUserIdInputSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId?: number | undefined;
}, {
    userId?: number | undefined;
}>;
export type TGetByUserIdInputSchema = z.infer<typeof ZGetByUserIdInputSchema>;
