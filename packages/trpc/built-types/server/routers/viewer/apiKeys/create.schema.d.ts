import { z } from "zod";
export declare const ZCreateInputSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    neverExpires: z.ZodOptional<z.ZodBoolean>;
    appId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    note?: string | null | undefined;
    expiresAt?: Date | null | undefined;
    neverExpires?: boolean | undefined;
    appId?: string | null | undefined;
    teamId?: number | undefined;
}, {
    note?: string | null | undefined;
    expiresAt?: Date | null | undefined;
    neverExpires?: boolean | undefined;
    appId?: string | null | undefined;
    teamId?: number | undefined;
}>;
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
