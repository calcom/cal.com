import { z } from "zod";
export declare const ZSetDefaultConferencingAppSchema: z.ZodObject<{
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
}, {
    slug: string;
}>;
export type TSetDefaultConferencingAppSchema = z.infer<typeof ZSetDefaultConferencingAppSchema>;
