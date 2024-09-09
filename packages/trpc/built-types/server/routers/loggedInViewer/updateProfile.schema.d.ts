import { z } from "zod";
export declare const updateUserMetadataAllowedKeys: z.ZodObject<{
    sessionTimeout: z.ZodOptional<z.ZodNumber>;
    defaultBookerLayouts: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        enabledLayouts: z.ZodArray<z.ZodUnion<[z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>]>, "many">;
        defaultLayout: z.ZodUnion<[z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>]>;
    }, "strip", z.ZodTypeAny, {
        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
    }, {
        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
    }>>>;
}, "strip", z.ZodTypeAny, {
    sessionTimeout?: number | undefined;
    defaultBookerLayouts?: {
        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
    } | null | undefined;
}, {
    sessionTimeout?: number | undefined;
    defaultBookerLayouts?: {
        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
    } | null | undefined;
}>;
export declare const ZUpdateProfileInputSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timeZone: z.ZodOptional<z.ZodString>;
    weekStart: z.ZodOptional<z.ZodString>;
    hideBranding: z.ZodOptional<z.ZodBoolean>;
    allowDynamicBooking: z.ZodOptional<z.ZodBoolean>;
    allowSEOIndexing: z.ZodOptional<z.ZodBoolean>;
    receiveMonthlyDigestEmail: z.ZodOptional<z.ZodBoolean>;
    brandColor: z.ZodOptional<z.ZodString>;
    darkBrandColor: z.ZodOptional<z.ZodString>;
    theme: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    appTheme: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    completedOnboarding: z.ZodOptional<z.ZodBoolean>;
    locale: z.ZodOptional<z.ZodString>;
    timeFormat: z.ZodOptional<z.ZodNumber>;
    disableImpersonation: z.ZodOptional<z.ZodBoolean>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        proPaidForByTeamId: z.ZodOptional<z.ZodNumber>;
        stripeCustomerId: z.ZodOptional<z.ZodString>;
        vitalSettings: z.ZodOptional<z.ZodObject<{
            connected: z.ZodOptional<z.ZodBoolean>;
            selectedParam: z.ZodOptional<z.ZodString>;
            sleepValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            connected?: boolean | undefined;
            selectedParam?: string | undefined;
            sleepValue?: number | undefined;
        }, {
            connected?: boolean | undefined;
            selectedParam?: string | undefined;
            sleepValue?: number | undefined;
        }>>;
        isPremium: z.ZodOptional<z.ZodBoolean>;
        sessionTimeout: z.ZodOptional<z.ZodNumber>;
        defaultConferencingApp: z.ZodOptional<z.ZodObject<{
            appSlug: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            appLink: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        }, {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        }>>;
        defaultBookerLayouts: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            enabledLayouts: z.ZodArray<z.ZodUnion<[z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>]>, "many">;
            defaultLayout: z.ZodUnion<[z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>]>;
        }, "strip", z.ZodTypeAny, {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        }, {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        }>>>;
        emailChangeWaitingForVerification: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        migratedToOrgFrom: z.ZodOptional<z.ZodObject<{
            username: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
            lastMigrationTime: z.ZodOptional<z.ZodString>;
            reverted: z.ZodOptional<z.ZodBoolean>;
            revertTime: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            revertTime?: string | undefined;
        }, {
            username?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            revertTime?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        proPaidForByTeamId?: number | undefined;
        stripeCustomerId?: string | undefined;
        vitalSettings?: {
            connected?: boolean | undefined;
            selectedParam?: string | undefined;
            sleepValue?: number | undefined;
        } | undefined;
        isPremium?: boolean | undefined;
        sessionTimeout?: number | undefined;
        defaultConferencingApp?: {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        } | undefined;
        defaultBookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
        emailChangeWaitingForVerification?: string | undefined;
        migratedToOrgFrom?: {
            username?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            revertTime?: string | undefined;
        } | undefined;
    }, {
        proPaidForByTeamId?: number | undefined;
        stripeCustomerId?: string | undefined;
        vitalSettings?: {
            connected?: boolean | undefined;
            selectedParam?: string | undefined;
            sleepValue?: number | undefined;
        } | undefined;
        isPremium?: boolean | undefined;
        sessionTimeout?: number | undefined;
        defaultConferencingApp?: {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        } | undefined;
        defaultBookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
        emailChangeWaitingForVerification?: string | undefined;
        migratedToOrgFrom?: {
            username?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            revertTime?: string | undefined;
        } | undefined;
    }>>>;
    travelSchedules: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodNumber>;
        timeZone: z.ZodString;
        endDate: z.ZodOptional<z.ZodDate>;
        startDate: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        timeZone: string;
        startDate: Date;
        id?: number | undefined;
        endDate?: Date | undefined;
    }, {
        timeZone: string;
        startDate: Date;
        id?: number | undefined;
        endDate?: Date | undefined;
    }>, "many">>;
    secondaryEmails: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        email: z.ZodString;
        isDeleted: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        email: string;
        isDeleted: boolean;
    }, {
        id: number;
        email: string;
        isDeleted?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | null | undefined;
    timeZone?: string | undefined;
    weekStart?: string | undefined;
    hideBranding?: boolean | undefined;
    allowDynamicBooking?: boolean | undefined;
    allowSEOIndexing?: boolean | undefined;
    receiveMonthlyDigestEmail?: boolean | undefined;
    brandColor?: string | undefined;
    darkBrandColor?: string | undefined;
    theme?: string | null | undefined;
    appTheme?: string | null | undefined;
    completedOnboarding?: boolean | undefined;
    locale?: string | undefined;
    timeFormat?: number | undefined;
    disableImpersonation?: boolean | undefined;
    metadata?: {
        proPaidForByTeamId?: number | undefined;
        stripeCustomerId?: string | undefined;
        vitalSettings?: {
            connected?: boolean | undefined;
            selectedParam?: string | undefined;
            sleepValue?: number | undefined;
        } | undefined;
        isPremium?: boolean | undefined;
        sessionTimeout?: number | undefined;
        defaultConferencingApp?: {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        } | undefined;
        defaultBookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
        emailChangeWaitingForVerification?: string | undefined;
        migratedToOrgFrom?: {
            username?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            revertTime?: string | undefined;
        } | undefined;
    } | null | undefined;
    travelSchedules?: {
        timeZone: string;
        startDate: Date;
        id?: number | undefined;
        endDate?: Date | undefined;
    }[] | undefined;
    secondaryEmails?: {
        id: number;
        email: string;
        isDeleted: boolean;
    }[] | undefined;
}, {
    username?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | null | undefined;
    timeZone?: string | undefined;
    weekStart?: string | undefined;
    hideBranding?: boolean | undefined;
    allowDynamicBooking?: boolean | undefined;
    allowSEOIndexing?: boolean | undefined;
    receiveMonthlyDigestEmail?: boolean | undefined;
    brandColor?: string | undefined;
    darkBrandColor?: string | undefined;
    theme?: string | null | undefined;
    appTheme?: string | null | undefined;
    completedOnboarding?: boolean | undefined;
    locale?: string | undefined;
    timeFormat?: number | undefined;
    disableImpersonation?: boolean | undefined;
    metadata?: {
        proPaidForByTeamId?: number | undefined;
        stripeCustomerId?: string | undefined;
        vitalSettings?: {
            connected?: boolean | undefined;
            selectedParam?: string | undefined;
            sleepValue?: number | undefined;
        } | undefined;
        isPremium?: boolean | undefined;
        sessionTimeout?: number | undefined;
        defaultConferencingApp?: {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        } | undefined;
        defaultBookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
        emailChangeWaitingForVerification?: string | undefined;
        migratedToOrgFrom?: {
            username?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            revertTime?: string | undefined;
        } | undefined;
    } | null | undefined;
    travelSchedules?: {
        timeZone: string;
        startDate: Date;
        id?: number | undefined;
        endDate?: Date | undefined;
    }[] | undefined;
    secondaryEmails?: {
        id: number;
        email: string;
        isDeleted?: boolean | undefined;
    }[] | undefined;
}>;
export type TUpdateProfileInputSchema = z.infer<typeof ZUpdateProfileInputSchema>;
