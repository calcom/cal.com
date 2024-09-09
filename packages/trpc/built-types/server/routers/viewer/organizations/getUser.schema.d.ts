import { z } from "zod";
export declare const ZGetUserInput: z.ZodObject<{
    userId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId?: number | undefined;
}, {
    userId?: number | undefined;
}>;
export type TGetUserInput = z.infer<typeof ZGetUserInput>;
