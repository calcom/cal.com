import { z } from "zod";
export declare const getAttributeSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type ZGetAttributeSchema = z.infer<typeof getAttributeSchema>;
