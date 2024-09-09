import { z } from "zod";
export declare const checkGlobalKeysSchema: z.ZodObject<{
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
}, {
    slug: string;
}>;
export type CheckGlobalKeysSchemaType = z.infer<typeof checkGlobalKeysSchema>;
