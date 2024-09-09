import { z } from "zod";
export declare const toggleActiveSchema: z.ZodObject<{
    attributeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    attributeId: string;
}, {
    attributeId: string;
}>;
export type ZToggleActiveSchema = z.infer<typeof toggleActiveSchema>;
