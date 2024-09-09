declare const authedProcedure: import("@trpc/server/unstable-core-do-not-import").ProcedureBuilder<import("../createContext").InnerContext, object, {
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
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            name?: string | undefined;
            slug?: string | null | undefined;
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
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            credentialId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        startTime: number;
        endTime: number;
        metadata: import(".prisma/client").Prisma.JsonValue;
        timeZone: string;
        bio: string | null;
        hideBranding: boolean;
        theme: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        selectedCalendars: {
            integration: string;
            externalId: string;
        }[];
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
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
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            name?: string | undefined;
            slug?: string | null | undefined;
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
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            credentialId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        startTime: number;
        endTime: number;
        metadata: import(".prisma/client").Prisma.JsonValue;
        timeZone: string;
        bio: string | null;
        hideBranding: boolean;
        theme: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        selectedCalendars: {
            integration: string;
            externalId: string;
        }[];
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
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
                name: string | null;
                id: number;
                startTime: number;
                endTime: number;
                email: string;
                locale: string | null;
                username: string | null;
                avatarUrl: string | null;
                bufferTime: number;
                defaultScheduleId: number | null;
                isPlatformManaged: boolean;
            };
            organization: {
                organizationSettings: {
                    lockEventTypeCreationForUsers: boolean;
                } | null;
                name: string;
                id: number;
                metadata: import(".prisma/client").Prisma.JsonValue;
                slug: string | null;
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
            }, "name" | "id" | "metadata" | "slug" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
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
            uid: string;
            userId: number;
            createdAt: Date & string;
            updatedAt: Date & string;
            organizationId: number;
            username: string;
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
}, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker>;
export declare const authedAdminProcedure: import("@trpc/server/unstable-core-do-not-import").ProcedureBuilder<import("../createContext").InnerContext, object, {
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
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            name?: string | undefined;
            slug?: string | null | undefined;
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
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            credentialId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        startTime: number;
        endTime: number;
        metadata: import(".prisma/client").Prisma.JsonValue;
        timeZone: string;
        bio: string | null;
        hideBranding: boolean;
        theme: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        selectedCalendars: {
            integration: string;
            externalId: string;
        }[];
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
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
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            name?: string | undefined;
            slug?: string | null | undefined;
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
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            credentialId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        startTime: number;
        endTime: number;
        metadata: import(".prisma/client").Prisma.JsonValue;
        timeZone: string;
        bio: string | null;
        hideBranding: boolean;
        theme: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        selectedCalendars: {
            integration: string;
            externalId: string;
        }[];
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
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
                name: string | null;
                id: number;
                startTime: number;
                endTime: number;
                email: string;
                locale: string | null;
                username: string | null;
                avatarUrl: string | null;
                bufferTime: number;
                defaultScheduleId: number | null;
                isPlatformManaged: boolean;
            };
            organization: {
                organizationSettings: {
                    lockEventTypeCreationForUsers: boolean;
                } | null;
                name: string;
                id: number;
                metadata: import(".prisma/client").Prisma.JsonValue;
                slug: string | null;
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
            }, "name" | "id" | "metadata" | "slug" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
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
            uid: string;
            userId: number;
            createdAt: Date & string;
            updatedAt: Date & string;
            organizationId: number;
            username: string;
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
}, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker>;
export declare const authedOrgAdminProcedure: import("@trpc/server/unstable-core-do-not-import").ProcedureBuilder<import("../createContext").InnerContext, object, {
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
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            name?: string | undefined;
            slug?: string | null | undefined;
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
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            credentialId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        startTime: number;
        endTime: number;
        metadata: import(".prisma/client").Prisma.JsonValue;
        timeZone: string;
        bio: string | null;
        hideBranding: boolean;
        theme: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        selectedCalendars: {
            integration: string;
            externalId: string;
        }[];
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
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
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            name?: string | undefined;
            slug?: string | null | undefined;
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
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            credentialId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        startTime: number;
        endTime: number;
        metadata: import(".prisma/client").Prisma.JsonValue;
        timeZone: string;
        bio: string | null;
        hideBranding: boolean;
        theme: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        selectedCalendars: {
            integration: string;
            externalId: string;
        }[];
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
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
                name: string | null;
                id: number;
                startTime: number;
                endTime: number;
                email: string;
                locale: string | null;
                username: string | null;
                avatarUrl: string | null;
                bufferTime: number;
                defaultScheduleId: number | null;
                isPlatformManaged: boolean;
            };
            organization: {
                organizationSettings: {
                    lockEventTypeCreationForUsers: boolean;
                } | null;
                name: string;
                id: number;
                metadata: import(".prisma/client").Prisma.JsonValue;
                slug: string | null;
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
            }, "name" | "id" | "metadata" | "slug" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
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
            uid: string;
            userId: number;
            createdAt: Date & string;
            updatedAt: Date & string;
            organizationId: number;
            username: string;
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
}, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker>;
export default authedProcedure;
