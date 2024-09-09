import { z } from "zod";
export declare const getByUserIdSchema: z.ZodObject<{
    userId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    userId: number;
}, {
    userId: number;
}>;
export type ZGetByUserIdSchema = z.infer<typeof getByUserIdSchema>;
