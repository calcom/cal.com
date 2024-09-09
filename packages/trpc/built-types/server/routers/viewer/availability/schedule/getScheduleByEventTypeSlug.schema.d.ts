import { z } from "zod";
export declare const ZGetByEventSlugInputSchema: z.ZodObject<{
    eventSlug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    eventSlug: string;
}, {
    eventSlug: string;
}>;
export type TGetByEventSlugInputSchema = z.infer<typeof ZGetByEventSlugInputSchema>;
