import { z } from "zod";
export declare const ZSaveKeysInputSchema: z.ZodObject<{
    slug: z.ZodString;
    dirName: z.ZodString;
    type: z.ZodString;
    keys: z.ZodUnknown;
    fromEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: string;
    slug: string;
    dirName: string;
    keys?: unknown;
    fromEnabled?: boolean | undefined;
}, {
    type: string;
    slug: string;
    dirName: string;
    keys?: unknown;
    fromEnabled?: boolean | undefined;
}>;
export type TSaveKeysInputSchema = z.infer<typeof ZSaveKeysInputSchema>;
