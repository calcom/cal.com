import { z } from "zod";
export declare const deleteAttributeSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type ZDeleteAttributeSchema = z.infer<typeof deleteAttributeSchema>;
