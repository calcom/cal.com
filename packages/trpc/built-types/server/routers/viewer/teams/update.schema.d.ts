import { z } from "zod";
export declare const ZUpdateInputSchema: z.ZodObject<{
    id: z.ZodNumber;
    bio: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    slug: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    hideBranding: z.ZodOptional<z.ZodBoolean>;
    hideBookATeamMember: z.ZodOptional<z.ZodBoolean>;
    isPrivate: z.ZodOptional<z.ZodBoolean>;
    brandColor: z.ZodOptional<z.ZodString>;
    darkBrandColor: z.ZodOptional<z.ZodString>;
    theme: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: number;
    bio?: string | undefined;
    name?: string | undefined;
    logo?: string | null | undefined;
    slug?: string | undefined;
    hideBranding?: boolean | undefined;
    hideBookATeamMember?: boolean | undefined;
    isPrivate?: boolean | undefined;
    brandColor?: string | undefined;
    darkBrandColor?: string | undefined;
    theme?: string | null | undefined;
}, {
    id: number;
    bio?: string | undefined;
    name?: string | undefined;
    logo?: string | null | undefined;
    slug?: string | undefined;
    hideBranding?: boolean | undefined;
    hideBookATeamMember?: boolean | undefined;
    isPrivate?: boolean | undefined;
    brandColor?: string | undefined;
    darkBrandColor?: string | undefined;
    theme?: string | null | undefined;
}>;
export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
