export declare const loggedInViewerRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
    ctx: import("../../createContext").InnerContext;
    meta: object;
    errorShape: import("@trpc/server/unstable-core-do-not-import").DefaultErrorShape;
    transformer: {
        stringify: (object: any) => string;
        parse: <T = unknown>(string: string) => T;
        serialize: (object: any) => import("superjson/dist/types").SuperJSONResult;
        deserialize: <T_1 = unknown>(payload: import("superjson/dist/types").SuperJSONResult) => T_1;
        registerClass: (v: import("superjson/dist/types").Class, options?: string | import("superjson/dist/class-registry").RegisterOptions | undefined) => void;
        registerSymbol: (v: Symbol, identifier?: string | undefined) => void;
        registerCustom: <I, O extends import("superjson/dist/types").JSONValue>(transformer: Omit<import("superjson/dist/custom-transformer-registry").CustomTransfomer<I, O>, "name">, name: string) => void;
        allowErrorProps: (...props: string[]) => void;
    };
}>, {
    me: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            includePasswordAdded?: boolean | undefined;
        } | undefined;
        output: {
            passwordAdded?: boolean | undefined;
            secondaryEmails: {
                id: number;
                email: string;
                emailVerified: Date | null;
            }[];
            sumOfBookings: number | undefined;
            sumOfCalendars: number | undefined;
            sumOfTeams: number | undefined;
            sumOfEventTypes: number | undefined;
            isPremium: boolean | undefined;
            sumOfTeamEventTypes: number;
            organizationId: null;
            organization: {
                id: number;
                isPlatform: boolean;
                slug: string;
                isOrgAdmin: boolean;
            };
            username: string | null;
            profile: import("@calcom/types/UserProfile").UserAsPersonalProfile;
            profiles: never[];
            id: number;
            name: string | null;
            email: string;
            emailMd5: string;
            emailVerified: Date | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            locale: string;
            timeFormat: number | null;
            timeZone: string;
            avatar: string;
            avatarUrl: string | null;
            createdDate: Date;
            trialEndsAt: Date | null;
            defaultScheduleId: number | null;
            completedOnboarding: boolean;
            twoFactorEnabled: boolean;
            disableImpersonation: boolean;
            identityProvider: import(".prisma/client").$Enums.IdentityProvider;
            identityProviderEmail: string;
            brandColor: string | null;
            darkBrandColor: string | null;
            bio: string | null;
            weekStart: string;
            theme: string | null;
            appTheme: string | null;
            hideBranding: boolean;
            metadata: import(".prisma/client").Prisma.JsonValue;
            defaultBookerLayouts: {
                enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
            } | null;
            allowDynamicBooking: boolean | null;
            allowSEOIndexing: boolean | null;
            receiveMonthlyDigestEmail: boolean | null;
        } | {
            passwordAdded?: boolean | undefined;
            secondaryEmails: {
                id: number;
                email: string;
                emailVerified: Date | null;
            }[];
            sumOfBookings: number | undefined;
            sumOfCalendars: number | undefined;
            sumOfTeams: number | undefined;
            sumOfEventTypes: number | undefined;
            isPremium: boolean | undefined;
            sumOfTeamEventTypes: number;
            organizationId: number | null;
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
            username: string | null;
            profile: import("@calcom/types/UserProfile").UserAsPersonalProfile | {
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
            profiles: import("@calcom/types/UserProfile").UserProfile[];
            id: number;
            name: string | null;
            email: string;
            emailMd5: string;
            emailVerified: Date | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            locale: string;
            timeFormat: number | null;
            timeZone: string;
            avatar: string;
            avatarUrl: string | null;
            createdDate: Date;
            trialEndsAt: Date | null;
            defaultScheduleId: number | null;
            completedOnboarding: boolean;
            twoFactorEnabled: boolean;
            disableImpersonation: boolean;
            identityProvider: import(".prisma/client").$Enums.IdentityProvider;
            identityProviderEmail: string;
            brandColor: string | null;
            darkBrandColor: string | null;
            bio: string | null;
            weekStart: string;
            theme: string | null;
            appTheme: string | null;
            hideBranding: boolean;
            metadata: import(".prisma/client").Prisma.JsonValue;
            defaultBookerLayouts: {
                enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
            } | null;
            allowDynamicBooking: boolean | null;
            allowSEOIndexing: boolean | null;
            receiveMonthlyDigestEmail: boolean | null;
        };
    }>;
    platformMe: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: number;
            username: string | null;
            email: string;
            timeFormat: number | null;
            timeZone: string;
            defaultScheduleId: number | null;
            weekStart: string;
            organizationId: number | null;
            organization: {
                isPlatform: any;
                id: number | null;
            };
        };
    }>;
    deleteMe: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            password: string;
            totpCode?: string | undefined;
        };
        output: void;
    }>;
    deleteMeWithoutPassword: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: void;
        output: void;
    }>;
    connectedCalendars: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            onboarding?: boolean | undefined;
        } | undefined;
        output: {
            connectedCalendars: ({
                integration: import("@calcom/types/App").App & {
                    credential: import("@calcom/app-store/utils").CredentialDataWithTeamName;
                    credentials: import("@calcom/app-store/utils").CredentialDataWithTeamName[];
                    locationOption: {
                        label: string;
                        value: string;
                        icon?: string | undefined;
                        disabled?: boolean | undefined;
                    } | null;
                };
                credentialId: number;
                primary?: undefined;
                calendars?: undefined;
                error?: undefined;
            } | {
                integration: {
                    installed?: boolean | undefined;
                    type: `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_other` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
                    title?: string | undefined;
                    name: string;
                    description: string;
                    variant: "other" | "payment" | "calendar" | "video" | "automation" | "conferencing" | "crm" | "other_calendar";
                    slug: string;
                    category?: string | undefined;
                    categories: import(".prisma/client").$Enums.AppCategories[];
                    extendsFeature?: "EventType" | "User" | undefined;
                    logo: string;
                    publisher: string;
                    url: string;
                    docsUrl?: string | undefined;
                    verified?: boolean | undefined;
                    trending?: boolean | undefined;
                    rating?: number | undefined;
                    reviews?: number | undefined;
                    isGlobal?: boolean | undefined;
                    simplePath?: string | undefined;
                    email: string;
                    key?: import(".prisma/client").Prisma.JsonValue | undefined;
                    feeType?: "monthly" | "usage-based" | "one-time" | "free" | undefined;
                    price?: number | undefined;
                    commission?: number | undefined;
                    licenseRequired?: boolean | undefined;
                    teamsPlanRequired?: {
                        upgradeUrl: string;
                    } | undefined;
                    appData?: import("@calcom/types/App").AppData | undefined;
                    paid?: import("@calcom/types/App").PaidAppData | undefined;
                    dirName?: string | undefined;
                    isTemplate?: boolean | undefined;
                    __template?: string | undefined;
                    dependencies?: string[] | undefined;
                    concurrentMeetings?: boolean | undefined;
                    createdAt?: string | undefined;
                    isOAuth?: boolean | undefined;
                    locationOption: {
                        label: string;
                        value: string;
                        icon?: string | undefined;
                        disabled?: boolean | undefined;
                    } | null;
                };
                credentialId: number;
                primary: {
                    readOnly: boolean;
                    primary: true | null;
                    isSelected: boolean;
                    credentialId: number;
                    name?: string | undefined;
                    email?: string | undefined;
                    primaryEmail?: string | undefined;
                    integrationTitle?: string | undefined;
                    userId?: number | undefined;
                    integration?: string | undefined;
                    externalId: string;
                };
                calendars: {
                    readOnly: boolean;
                    primary: true | null;
                    isSelected: boolean;
                    credentialId: number;
                    name?: string | undefined;
                    email?: string | undefined;
                    primaryEmail?: string | undefined;
                    integrationTitle?: string | undefined;
                    userId?: number | undefined;
                    integration?: string | undefined;
                    externalId: string;
                }[];
                error?: undefined;
            } | {
                integration: {
                    installed?: boolean | undefined;
                    type: `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_other` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
                    title?: string | undefined;
                    name: string;
                    description: string;
                    variant: "other" | "payment" | "calendar" | "video" | "automation" | "conferencing" | "crm" | "other_calendar";
                    slug: string;
                    category?: string | undefined;
                    categories: import(".prisma/client").$Enums.AppCategories[];
                    extendsFeature?: "EventType" | "User" | undefined;
                    logo: string;
                    publisher: string;
                    url: string;
                    docsUrl?: string | undefined;
                    verified?: boolean | undefined;
                    trending?: boolean | undefined;
                    rating?: number | undefined;
                    reviews?: number | undefined;
                    isGlobal?: boolean | undefined;
                    simplePath?: string | undefined;
                    email: string;
                    key?: import(".prisma/client").Prisma.JsonValue | undefined;
                    feeType?: "monthly" | "usage-based" | "one-time" | "free" | undefined;
                    price?: number | undefined;
                    commission?: number | undefined;
                    licenseRequired?: boolean | undefined;
                    teamsPlanRequired?: {
                        upgradeUrl: string;
                    } | undefined;
                    appData?: import("@calcom/types/App").AppData | undefined;
                    paid?: import("@calcom/types/App").PaidAppData | undefined;
                    dirName?: string | undefined;
                    isTemplate?: boolean | undefined;
                    __template?: string | undefined;
                    dependencies?: string[] | undefined;
                    concurrentMeetings?: boolean | undefined;
                    createdAt?: string | undefined;
                    isOAuth?: boolean | undefined;
                    locationOption: {
                        label: string;
                        value: string;
                        icon?: string | undefined;
                        disabled?: boolean | undefined;
                    } | null;
                };
                credentialId: number;
                error: {
                    message: string;
                };
                primary?: undefined;
                calendars?: undefined;
            })[];
            destinationCalendar: {
                primary?: boolean | undefined;
                name?: string | undefined;
                readOnly?: boolean | undefined;
                email?: string | undefined;
                primaryEmail: string | null;
                credentialId: number | null;
                integrationTitle?: string | undefined;
                userId: number | null;
                integration: string;
                externalId: string;
                id: number;
                eventTypeId: number | null;
            };
        };
    }>;
    setDestinationCalendar: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            externalId: string;
            integration: string;
            eventTypeId?: number | null | undefined;
            bookingId?: number | null | undefined;
        };
        output: void;
    }>;
    integrations: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            variant?: string | undefined;
            exclude?: string[] | undefined;
            onlyInstalled?: boolean | undefined;
            includeTeamInstalledApps?: boolean | undefined;
            extendsFeature?: "EventType" | undefined;
            teamId?: number | null | undefined;
            sortByMostPopular?: boolean | undefined;
            categories?: ("other" | "payment" | "calendar" | "messaging" | "video" | "web3" | "automation" | "analytics" | "conferencing" | "crm")[] | undefined;
            appId?: string | undefined;
        };
        output: {
            items: {
                dependencyData?: import("@calcom/app-store/_appRegistry").TDependencyData | undefined;
                userCredentialIds: number[];
                invalidCredentialIds: number[];
                teams: ({
                    teamId: number;
                    name: string;
                    logoUrl: string | null;
                    credentialId: number;
                    isAdmin: boolean;
                } | null)[];
                isInstalled: boolean | undefined;
                isSetupAlready: boolean | undefined;
                credentialOwner?: import("@calcom/app-store/types").CredentialOwner | undefined;
                installed?: boolean | undefined;
                type: `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_other` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
                title?: string | undefined;
                name: string;
                description: string;
                variant: "other" | "payment" | "calendar" | "video" | "automation" | "conferencing" | "crm" | "other_calendar";
                slug: string;
                category?: string | undefined;
                categories: import(".prisma/client").$Enums.AppCategories[];
                extendsFeature?: "EventType" | "User" | undefined;
                logo: string;
                publisher: string;
                url: string;
                docsUrl?: string | undefined;
                verified?: boolean | undefined;
                trending?: boolean | undefined;
                rating?: number | undefined;
                reviews?: number | undefined;
                isGlobal?: boolean | undefined;
                simplePath?: string | undefined;
                email: string;
                feeType?: "monthly" | "usage-based" | "one-time" | "free" | undefined;
                price?: number | undefined;
                commission?: number | undefined;
                licenseRequired?: boolean | undefined;
                teamsPlanRequired?: {
                    upgradeUrl: string;
                } | undefined;
                appData?: import("@calcom/types/App").AppData | undefined;
                paid?: import("@calcom/types/App").PaidAppData | undefined;
                dirName?: string | undefined;
                isTemplate?: boolean | undefined;
                __template?: string | undefined;
                dependencies?: string[] | undefined;
                concurrentMeetings?: boolean | undefined;
                createdAt?: string | undefined;
                isOAuth?: boolean | undefined;
                locationOption: {
                    label: string;
                    value: string;
                    icon?: string | undefined;
                    disabled?: boolean | undefined;
                } | null;
                enabled: boolean;
            }[];
        };
    }>;
    appById: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            appId: string;
        };
        output: {
            installed?: boolean | undefined;
            type: `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_other` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
            title?: string | undefined;
            name: string;
            description: string;
            variant: "other" | "payment" | "calendar" | "video" | "automation" | "conferencing" | "crm" | "other_calendar";
            slug: string;
            category?: string | undefined;
            categories: import(".prisma/client").$Enums.AppCategories[];
            extendsFeature?: "EventType" | "User" | undefined;
            logo: string;
            publisher: string;
            url: string;
            docsUrl?: string | undefined;
            verified?: boolean | undefined;
            trending?: boolean | undefined;
            rating?: number | undefined;
            reviews?: number | undefined;
            isGlobal?: boolean | undefined;
            simplePath?: string | undefined;
            email: string;
            key?: import(".prisma/client").Prisma.JsonValue | undefined;
            feeType?: "monthly" | "usage-based" | "one-time" | "free" | undefined;
            price?: number | undefined;
            commission?: number | undefined;
            licenseRequired?: boolean | undefined;
            teamsPlanRequired?: {
                upgradeUrl: string;
            } | undefined;
            appData?: import("@calcom/types/App").AppData | undefined;
            paid?: import("@calcom/types/App").PaidAppData | undefined;
            dirName?: string | undefined;
            isTemplate?: boolean | undefined;
            __template?: string | undefined;
            dependencies?: string[] | undefined;
            concurrentMeetings?: boolean | undefined;
            createdAt?: string | undefined;
            isOAuth?: boolean | undefined;
            locationOption: {
                label: string;
                value: string;
                icon?: string | undefined;
                disabled?: boolean | undefined;
            } | null;
            isInstalled: number;
        };
    }>;
    appCredentialsByType: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            appType: string;
        };
        output: {
            credentials: {
                type: string;
                id: number;
                userId: number | null;
                teamId: number | null;
                subscriptionId: string | null;
                appId: string | null;
                key: import(".prisma/client").Prisma.JsonValue;
                paymentStatus: string | null;
                billingCycleStart: number | null;
                invalid: boolean | null;
            }[];
            userAdminTeams: number[];
        };
    }>;
    stripeCustomer: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            isPremium: boolean;
            username: string | null;
        };
    }>;
    updateProfile: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
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
        };
        output: {
            email: string | undefined;
            avatarUrl: string | null;
            hasEmailBeenChanged: boolean | "" | undefined;
            sendEmailVerification: boolean;
            username?: string | undefined;
            name?: string | undefined;
            bio?: string | undefined;
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
        };
    }>;
    unlinkConnectedAccount: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: void;
        output: {
            message: string;
        };
    }>;
    eventTypeOrder: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            ids: number[];
        };
        output: void;
    }>;
    routingFormOrder: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            ids: string[];
        };
        output: void;
    }>;
    workflowOrder: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            ids: number[];
        };
        output: void;
    }>;
    submitFeedback: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            rating: string;
            comment: string;
        };
        output: void;
    }>;
    locationOptions: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId?: number | undefined;
        };
        output: {
            label: string;
            options: {
                label: string;
                value: string;
                disabled?: boolean | undefined;
                icon?: string | undefined;
                slug?: string | undefined;
                credentialId?: number | undefined;
            }[];
        }[];
    }>;
    deleteCredential: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: number;
            externalId?: string | undefined;
            teamId?: number | undefined;
        };
        output: void;
    }>;
    bookingUnconfirmedCount: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: number;
    }>;
    getCalVideoRecordings: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            roomName: string;
        };
        output: {
            data: import("zod").objectOutputType<{
                id: import("zod").ZodString;
                room_name: import("zod").ZodString;
                start_ts: import("zod").ZodNumber;
                status: import("zod").ZodString;
                max_participants: import("zod").ZodOptional<import("zod").ZodNumber>;
                duration: import("zod").ZodNumber;
                share_token: import("zod").ZodString;
            }, import("zod").ZodTypeAny, "passthrough">[];
            total_count: number;
        } | {} | undefined;
    }>;
    getUserTopBanners: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            teamUpgradeBanner: ({
                team: {
                    children: {
                        id: number;
                        slug: string | null;
                        parentId: number | null;
                        timeZone: string;
                        metadata: import(".prisma/client").Prisma.JsonValue;
                        name: string;
                        bio: string | null;
                        weekStart: string;
                        hideBranding: boolean;
                        theme: string | null;
                        timeFormat: number | null;
                        brandColor: string | null;
                        darkBrandColor: string | null;
                        smsLockState: import(".prisma/client").$Enums.SMSLockState;
                        smsLockReviewedByAdmin: boolean;
                        createdAt: Date;
                        logoUrl: string | null;
                        calVideoLogo: string | null;
                        appLogo: string | null;
                        appIconLogo: string | null;
                        isPrivate: boolean;
                        hideBookATeamMember: boolean;
                        bannerUrl: string | null;
                        isOrganization: boolean;
                        pendingPayment: boolean;
                        isPlatform: boolean;
                        createdByOAuthClientId: string | null;
                    }[];
                } & {
                    id: number;
                    slug: string | null;
                    parentId: number | null;
                    timeZone: string;
                    metadata: import(".prisma/client").Prisma.JsonValue;
                    name: string;
                    bio: string | null;
                    weekStart: string;
                    hideBranding: boolean;
                    theme: string | null;
                    timeFormat: number | null;
                    brandColor: string | null;
                    darkBrandColor: string | null;
                    smsLockState: import(".prisma/client").$Enums.SMSLockState;
                    smsLockReviewedByAdmin: boolean;
                    createdAt: Date;
                    logoUrl: string | null;
                    calVideoLogo: string | null;
                    appLogo: string | null;
                    appIconLogo: string | null;
                    isPrivate: boolean;
                    hideBookATeamMember: boolean;
                    bannerUrl: string | null;
                    isOrganization: boolean;
                    pendingPayment: boolean;
                    isPlatform: boolean;
                    createdByOAuthClientId: string | null;
                };
            } & {
                id: number;
                userId: number;
                teamId: number;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
                accepted: boolean;
            })[];
            orgUpgradeBanner: ({
                team: {
                    id: number;
                    slug: string | null;
                    parentId: number | null;
                    timeZone: string;
                    metadata: import(".prisma/client").Prisma.JsonValue;
                    name: string;
                    bio: string | null;
                    weekStart: string;
                    hideBranding: boolean;
                    theme: string | null;
                    timeFormat: number | null;
                    brandColor: string | null;
                    darkBrandColor: string | null;
                    smsLockState: import(".prisma/client").$Enums.SMSLockState;
                    smsLockReviewedByAdmin: boolean;
                    createdAt: Date;
                    logoUrl: string | null;
                    calVideoLogo: string | null;
                    appLogo: string | null;
                    appIconLogo: string | null;
                    isPrivate: boolean;
                    hideBookATeamMember: boolean;
                    bannerUrl: string | null;
                    isOrganization: boolean;
                    pendingPayment: boolean;
                    isPlatform: boolean;
                    createdByOAuthClientId: string | null;
                };
            } & {
                id: number;
                userId: number;
                teamId: number;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
                accepted: boolean;
            })[];
            verifyEmailBanner: boolean;
            calendarCredentialBanner: boolean;
            invalidAppCredentialBanners: import("@calcom/features/users/components/InvalidAppCredentialsBanner").InvalidAppCredentialBannerProps[];
        };
    }>;
    getDownloadLinkOfCalVideoRecordings: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            recordingId: string;
        };
        output: {
            download_link: string;
        } | undefined;
    }>;
    getUsersDefaultConferencingApp: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        } | undefined;
    }>;
    updateUserDefaultConferencingApp: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        };
        output: {
            appSlug?: string | undefined;
            appLink?: string | undefined;
        };
    }>;
    shouldVerifyEmail: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: number;
            email: string;
            isVerified: boolean;
        };
    }>;
    teamsAndUserProfilesQuery: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            includeOrg?: boolean | undefined;
        } | undefined;
        output: ({
            teamId: number;
            name: string;
            slug: string | null;
            image: string;
            role: import(".prisma/client").$Enums.MembershipRole;
            readOnly: boolean;
        } | {
            teamId: null;
            name: string | null;
            slug: string | null;
            image: string;
            readOnly: boolean;
        })[];
    }>;
    connectAndJoin: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            token: string;
        };
        output: {
            isBookingAlreadyAcceptedBySomeoneElse: boolean;
            meetingUrl: string;
        };
    }>;
    outOfOfficeCreateOrUpdate: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            dateRange: {
                endDate: Date;
                startDate: Date;
            };
            offset: number;
            toTeamUserId: number | null;
            reasonId: number;
            uuid?: string | null | undefined;
            notes?: string | null | undefined;
        };
        output: {} | undefined;
    }>;
    outOfOfficeEntriesList: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: number;
            notes: string | null;
            end: Date;
            start: Date;
            reason: {
                id: number;
                userId: number | null;
                reason: string;
                emoji: string;
            } | null;
            uuid: string;
            toUserId: number | null;
            toUser: {
                username: string | null;
            } | null;
        }[];
    }>;
    outOfOfficeEntryDelete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            outOfOfficeUid: string;
        };
        output: {};
    }>;
    addSecondaryEmail: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            email: string;
        };
        output: {
            data: {
                id: number;
                userId: number;
                email: string;
                emailVerified: Date | null;
            };
            message: string;
        };
    }>;
    getTravelSchedules: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: number;
            timeZone: string;
            endDate: Date | null;
            startDate: Date;
        }[];
    }>;
    outOfOfficeReasonList: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: number;
            userId: number | null;
            reason: string;
            enabled: boolean;
            emoji: string;
        }[];
    }>;
    addNotificationsSubscription: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            subscription: string;
        };
        output: {
            message: string;
        };
    }>;
    removeNotificationsSubscription: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            subscription: string;
        };
        output: {
            message: string;
        };
    }>;
    markNoShow: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            bookingUid: string;
            attendees?: {
                email: string;
                noShow: boolean;
            }[] | undefined;
            noShowHost?: boolean | undefined;
        };
        output: {
            attendees: {
                email: string;
                noShow: boolean;
            }[];
            noShowHost: boolean;
            message: string;
        };
    }>;
}>;
