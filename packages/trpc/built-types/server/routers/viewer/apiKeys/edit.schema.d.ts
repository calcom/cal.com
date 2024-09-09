import { z } from "zod";
export declare const ZEditInputSchema: z.ZodObject<{
    id: z.ZodString;
    note: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    expiresAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    note?: string | null | undefined;
    expiresAt?: Date | undefined;
}, {
    id: string;
    note?: string | null | undefined;
    expiresAt?: Date | undefined;
}>;
export type TEditInputSchema = z.infer<typeof ZEditInputSchema>;
