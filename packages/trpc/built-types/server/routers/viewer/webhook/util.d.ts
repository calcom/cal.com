export declare const webhookProcedure: import("@trpc/server/unstable-core-do-not-import").ProcedureBuilder<import("../../../createContext").InnerContext, object, {
    user: {
        avatar: string;
        organization: {
            id: number | null;
            isOrgAdmin: boolean;
            metadata: {
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
            } | null;
            requestedSlug: string | null;
            slug?: string | null | undefined;
            name?: string | undefined;
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            logoUrl?: string | null | undefined;
            calVideoLogo?: string | null | undefined;
            isPrivate?: boolean | undefined;
            bannerUrl?: string | null | undefined;
            isPlatform?: boolean | undefined;
            members?: {
                id: number;
                userId: number;
                teamId: number;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
                accepted: boolean;
            }[] | undefined;
        };
        organizationId: number | null;
        id: number;
        email: string;
        username: string | null;
        locale: string;
        defaultBookerLayouts: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null;
        timeZone: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
        destinationCalendar: {
            id: number;
            userId: number | null;
            credentialId: number | null;
            eventTypeId: number | null;
            externalId: string;
            integration: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        emailVerified: Date | null;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        bio: string | null;
        avatarUrl: string | null;
        weekStart: string;
        startTime: number;
        endTime: number;
        bufferTime: number;
        hideBranding: boolean;
        theme: string | null;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        timeFormat: number | null;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        brandColor: string | null;
        darkBrandColor: string | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
        selectedCalendars: {
            externalId: string;
            integration: string;
        }[];
        profile: import("@calcom/types/UserProfile").UserAsPersonalProfile;
    } | {
        avatar: string;
        organization: {
            id: number | null;
            isOrgAdmin: boolean;
            metadata: {
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
            } | null;
            requestedSlug: string | null;
            slug?: string | null | undefined;
            name?: string | undefined;
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            logoUrl?: string | null | undefined;
            calVideoLogo?: string | null | undefined;
            isPrivate?: boolean | undefined;
            bannerUrl?: string | null | undefined;
            isPlatform?: boolean | undefined;
            members?: {
                id: number;
                userId: number;
                teamId: number;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
                accepted: boolean;
            }[] | undefined;
        };
        organizationId: number | null;
        id: number;
        email: string;
        username: string | null;
        locale: string;
        defaultBookerLayouts: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null;
        timeZone: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
        destinationCalendar: {
            id: number;
            userId: number | null;
            credentialId: number | null;
            eventTypeId: number | null;
            externalId: string;
            integration: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        emailVerified: Date | null;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        bio: string | null;
        avatarUrl: string | null;
        weekStart: string;
        startTime: number;
        endTime: number;
        bufferTime: number;
        hideBranding: boolean;
        theme: string | null;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        timeFormat: number | null;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        brandColor: string | null;
        darkBrandColor: string | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
        selectedCalendars: {
            externalId: string;
            integration: string;
        }[];
        profile: {
            name: string | null;
            avatarUrl: string | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            username: string | null;
            upId: string;
            id: null;
            organizationId: null;
            organization: null;
        } | {
            name: string | null;
            avatarUrl: string | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            user: {
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                locale: string | null;
                avatarUrl: string | null;
                startTime: number;
                endTime: number;
                bufferTime: number;
                defaultScheduleId: number | null;
                isPlatformManaged: boolean;
            };
            organization: {
                id: number;
                slug: string | null;
                metadata: import(".prisma/client").Prisma.JsonValue;
                name: string;
                organizationSettings: {
                    lockEventTypeCreationForUsers: boolean;
                } | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                isPrivate: boolean;
                bannerUrl: string | null;
                isPlatform: boolean;
                members: {
                    id: number;
                    userId: number;
                    teamId: number;
                    role: import(".prisma/client").$Enums.MembershipRole;
                    disableImpersonation: boolean;
                    accepted: boolean;
                }[];
            } & Omit<Pick<{
                id: number;
                name: string;
                slug: string | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                appLogo: string | null;
                appIconLogo: string | null;
                bio: string | null;
                hideBranding: boolean;
                isPrivate: boolean;
                hideBookATeamMember: boolean;
                createdAt: Date;
                metadata: import(".prisma/client").Prisma.JsonValue;
                theme: string | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                bannerUrl: string | null;
                parentId: number | null;
                timeFormat: number | null;
                timeZone: string;
                weekStart: string;
                isOrganization: boolean;
                pendingPayment: boolean;
                isPlatform: boolean;
                createdByOAuthClientId: string | null;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
            }, "id" | "slug" | "metadata" | "name" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
                requestedSlug: string | null;
                metadata: {
                    requestedSlug: string | null;
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
                };
            };
            movedFromUser: {
                id: number;
            } | null;
            id: number;
            userId: number;
            uid: string;
            username: string;
            organizationId: number;
            createdAt: Date & string;
            updatedAt: Date & string;
            upId: string;
        };
    };
    session: {
        upId: string;
        hasValidLicense: boolean;
        profileId?: number | null | undefined;
        user: import("next-auth").User;
        expires: string;
    };
}, {
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
} | undefined, {
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
} | undefined, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker>;
