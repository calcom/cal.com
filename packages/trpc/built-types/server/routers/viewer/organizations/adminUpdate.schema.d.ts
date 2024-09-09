import { z } from "zod";
export declare const ZAdminUpdate: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    organizationSettings: z.ZodOptional<z.ZodObject<{
        isOrganizationVerified: z.ZodOptional<z.ZodBoolean>;
        isOrganizationConfigured: z.ZodOptional<z.ZodBoolean>;
        isAdminReviewed: z.ZodOptional<z.ZodBoolean>;
        orgAutoAcceptEmail: z.ZodOptional<z.ZodString>;
        isAdminAPIEnabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        isOrganizationVerified?: boolean | undefined;
        isOrganizationConfigured?: boolean | undefined;
        isAdminReviewed?: boolean | undefined;
        orgAutoAcceptEmail?: string | undefined;
        isAdminAPIEnabled?: boolean | undefined;
    }, {
        isOrganizationVerified?: boolean | undefined;
        isOrganizationConfigured?: boolean | undefined;
        isAdminReviewed?: boolean | undefined;
        orgAutoAcceptEmail?: string | undefined;
        isAdminAPIEnabled?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: number;
    name?: string | undefined;
    slug?: string | null | undefined;
    organizationSettings?: {
        isOrganizationVerified?: boolean | undefined;
        isOrganizationConfigured?: boolean | undefined;
        isAdminReviewed?: boolean | undefined;
        orgAutoAcceptEmail?: string | undefined;
        isAdminAPIEnabled?: boolean | undefined;
    } | undefined;
}, {
    id: number;
    name?: string | undefined;
    slug?: string | null | undefined;
    organizationSettings?: {
        isOrganizationVerified?: boolean | undefined;
        isOrganizationConfigured?: boolean | undefined;
        isAdminReviewed?: boolean | undefined;
        orgAutoAcceptEmail?: string | undefined;
        isAdminAPIEnabled?: boolean | undefined;
    } | undefined;
}>;
export type TAdminUpdate = z.infer<typeof ZAdminUpdate>;
