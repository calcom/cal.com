import { z } from "zod";
export declare const ZDeleteInputSchema: z.ZodObject<{
    id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: number;
}>;
export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
