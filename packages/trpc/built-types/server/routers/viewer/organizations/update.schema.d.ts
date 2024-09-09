import { z } from "zod";
export declare const ZUpdateInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    orgId: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, number, string>, z.ZodNumber]>>;
    bio: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    calVideoLogo: z.ZodEffects<z.ZodNullable<z.ZodOptional<z.ZodString>>, string | null, string | null | undefined>;
    banner: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    slug: z.ZodOptional<z.ZodString>;
    hideBranding: z.ZodOptional<z.ZodBoolean>;
    hideBookATeamMember: z.ZodOptional<z.ZodBoolean>;
    brandColor: z.ZodOptional<z.ZodString>;
    darkBrandColor: z.ZodOptional<z.ZodString>;
    theme: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    timeZone: z.ZodOptional<z.ZodString>;
    weekStart: z.ZodOptional<z.ZodString>;
    timeFormat: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodObject<{
        requestedSlug: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
        paymentId: z.ZodOptional<z.ZodString>;
        subscriptionId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        subscriptionItemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        orgSeats: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        orgPricePerSeat: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        migratedToOrgFrom: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            teamSlug: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
            lastMigrationTime: z.ZodOptional<z.ZodString>;
            reverted: z.ZodOptional<z.ZodBoolean>;
            lastRevertTime: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        }, {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        }>>>;
        billingPeriod: z.ZodOptional<z.ZodOptional<z.ZodNativeEnum<typeof import("@calcom/prisma/zod-utils").BillingPeriod>>>;
    }, "strip", z.ZodTypeAny, {
        requestedSlug?: string | null | undefined;
        paymentId?: string | undefined;
        subscriptionId?: string | null | undefined;
        subscriptionItemId?: string | null | undefined;
        orgSeats?: number | null | undefined;
        orgPricePerSeat?: number | null | undefined;
        migratedToOrgFrom?: {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        } | undefined;
        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
    }, {
        requestedSlug?: string | null | undefined;
        paymentId?: string | undefined;
        subscriptionId?: string | null | undefined;
        subscriptionItemId?: string | null | undefined;
        orgSeats?: number | null | undefined;
        orgPricePerSeat?: number | null | undefined;
        migratedToOrgFrom?: {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        } | undefined;
        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
    }>>;
    lockEventTypeCreation: z.ZodOptional<z.ZodBoolean>;
    lockEventTypeCreationOptions: z.ZodOptional<z.ZodEnum<["DELETE", "HIDE"]>>;
    adminGetsNoSlotsNotification: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    calVideoLogo: string | null;
    name?: string | undefined;
    orgId?: number | undefined;
    bio?: string | undefined;
    logoUrl?: string | null | undefined;
    banner?: string | null | undefined;
    slug?: string | undefined;
    hideBranding?: boolean | undefined;
    hideBookATeamMember?: boolean | undefined;
    brandColor?: string | undefined;
    darkBrandColor?: string | undefined;
    theme?: string | null | undefined;
    timeZone?: string | undefined;
    weekStart?: string | undefined;
    timeFormat?: number | undefined;
    metadata?: {
        requestedSlug?: string | null | undefined;
        paymentId?: string | undefined;
        subscriptionId?: string | null | undefined;
        subscriptionItemId?: string | null | undefined;
        orgSeats?: number | null | undefined;
        orgPricePerSeat?: number | null | undefined;
        migratedToOrgFrom?: {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        } | undefined;
        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
    } | undefined;
    lockEventTypeCreation?: boolean | undefined;
    lockEventTypeCreationOptions?: "DELETE" | "HIDE" | undefined;
    adminGetsNoSlotsNotification?: boolean | undefined;
}, {
    name?: string | undefined;
    orgId?: string | number | undefined;
    bio?: string | undefined;
    logoUrl?: string | null | undefined;
    calVideoLogo?: string | null | undefined;
    banner?: string | null | undefined;
    slug?: string | undefined;
    hideBranding?: boolean | undefined;
    hideBookATeamMember?: boolean | undefined;
    brandColor?: string | undefined;
    darkBrandColor?: string | undefined;
    theme?: string | null | undefined;
    timeZone?: string | undefined;
    weekStart?: string | undefined;
    timeFormat?: number | undefined;
    metadata?: {
        requestedSlug?: string | null | undefined;
        paymentId?: string | undefined;
        subscriptionId?: string | null | undefined;
        subscriptionItemId?: string | null | undefined;
        orgSeats?: number | null | undefined;
        orgPricePerSeat?: number | null | undefined;
        migratedToOrgFrom?: {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        } | undefined;
        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
    } | undefined;
    lockEventTypeCreation?: boolean | undefined;
    lockEventTypeCreationOptions?: "DELETE" | "HIDE" | undefined;
    adminGetsNoSlotsNotification?: boolean | undefined;
}>;
export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
