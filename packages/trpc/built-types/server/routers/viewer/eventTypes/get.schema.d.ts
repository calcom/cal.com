import { z } from "zod";
export declare const ZGetInputSchema: z.ZodObject<{
    id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: number;
}>;
export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
