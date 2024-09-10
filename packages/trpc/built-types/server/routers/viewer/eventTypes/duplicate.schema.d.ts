import type { z } from "zod";
export declare const ZDuplicateInputSchema: z.ZodObject<{
    id: z.ZodNumber;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    length: z.ZodNumber;
    teamId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strict", z.ZodTypeAny, {
    length: number;
    id: number;
    title: string;
    slug: string;
    description: string;
    teamId?: number | null | undefined;
}, {
    length: number;
    id: number;
    title: string;
    slug: string;
    description: string;
    teamId?: number | null | undefined;
}>;
export type TDuplicateInputSchema = z.infer<typeof ZDuplicateInputSchema>;
