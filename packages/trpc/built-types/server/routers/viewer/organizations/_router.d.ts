export declare const viewerOrganizationsRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
    ctx: import("../../../createContext").InnerContext;
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
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            name: string;
            slug: string;
            orgOwnerEmail: string;
            language?: string | undefined;
            seats?: number | undefined;
            pricePerSeat?: number | undefined;
            isPlatform?: boolean | undefined;
            billingPeriod?: import("./create.schema").BillingPeriod | undefined;
        };
        output: {
            userId: number;
            email: string;
            organizationId: number;
            upId: string;
        };
    }>;
    update: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
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
        };
        output: {
            update: boolean;
            userId: number;
            data: {
                name: string;
                id: number;
                createdAt: Date;
                metadata: import(".prisma/client").Prisma.JsonValue;
                timeZone: string;
                slug: string | null;
                parentId: number | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                appLogo: string | null;
                appIconLogo: string | null;
                bio: string | null;
                hideBranding: boolean;
                isPrivate: boolean;
                hideBookATeamMember: boolean;
                theme: string | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                bannerUrl: string | null;
                timeFormat: number | null;
                weekStart: string;
                isOrganization: boolean;
                pendingPayment: boolean;
                isPlatform: boolean;
                createdByOAuthClientId: string | null;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
            };
        };
    }>;
    verifyCode: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            code: string;
            email: string;
        };
        output: true;
    }>;
    createTeams: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            orgId: number;
            teamNames: string[];
            moveTeams: {
                id: number;
                newSlug: string | null;
                shouldMove: boolean;
            }[];
        };
        output: {
            duplicatedSlugs: string[];
        };
    }>;
    listCurrent: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
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
            name: string;
            id: number;
            createdAt: Date;
            timeZone: string;
            slug: string | null;
            parentId: number | null;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            bio: string | null;
            hideBranding: boolean;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            bannerUrl: string | null;
            timeFormat: number | null;
            weekStart: string;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
            canAdminImpersonate: boolean;
            organizationSettings: {
                lockEventTypeCreationForUsers: boolean | undefined;
                adminGetsNoSlotsNotification: boolean | undefined;
            };
            user: {
                role: import(".prisma/client").$Enums.MembershipRole;
                accepted: boolean;
            };
        };
    }>;
    checkIfOrgNeedsUpgrade: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: ({
            team: {
                name: string;
                id: number;
                createdAt: Date;
                metadata: import(".prisma/client").Prisma.JsonValue;
                timeZone: string;
                slug: string | null;
                parentId: number | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                appLogo: string | null;
                appIconLogo: string | null;
                bio: string | null;
                hideBranding: boolean;
                isPrivate: boolean;
                hideBookATeamMember: boolean;
                theme: string | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                bannerUrl: string | null;
                timeFormat: number | null;
                weekStart: string;
                isOrganization: boolean;
                pendingPayment: boolean;
                isPlatform: boolean;
                createdByOAuthClientId: string | null;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
            };
        } & {
            id: number;
            userId: number;
            teamId: number;
            role: import(".prisma/client").$Enums.MembershipRole;
            disableImpersonation: boolean;
            accepted: boolean;
        })[];
    }>;
    publish: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: void;
        output: {
            url: string;
            message: string;
        };
    }>;
    setPassword: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            newPassword: string;
        };
        output: {
            update: boolean;
        };
    }>;
    getMembers: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamIdToExclude?: number | undefined;
            accepted?: boolean | undefined;
            distinctUser?: boolean | undefined;
        };
        output: {
            user: {
                name: string | null;
                id: number;
                email: string;
                username: string | null;
                avatarUrl: string | null;
                completedOnboarding: boolean;
            };
            id: number;
            userId: number;
            teamId: number;
            role: import(".prisma/client").$Enums.MembershipRole;
            disableImpersonation: boolean;
            accepted: boolean;
        }[];
    }>;
    listMembers: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            limit: number;
            cursor?: number | null | undefined;
            searchTerm?: string | undefined;
        };
        output: {
            canUserGetMembers: boolean;
            rows: never[];
            meta: {
                totalRowCount: number;
            };
            nextCursor?: undefined;
        } | {
            rows: {
                id: number;
                username: string | null;
                email: string;
                timeZone: string;
                role: import(".prisma/client").$Enums.MembershipRole;
                accepted: boolean;
                disableImpersonation: boolean;
                completedOnboarding: boolean;
                avatarUrl: string | null;
                teams: ({
                    id: number;
                    name: string;
                    slug: string | null;
                } | undefined)[];
            }[];
            nextCursor: number | undefined;
            meta: {
                totalRowCount: number;
            };
            canUserGetMembers?: undefined;
        };
    }>;
    getBrand: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
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
            slug: string;
            fullDomain: string;
            domainSuffix: string;
            name: string;
            logoUrl: string | null;
            isPlatform: boolean;
        } | null;
    }>;
    getUser: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            userId?: number | undefined;
        };
        output: {
            teams: {
                accepted: boolean;
                name: string;
                id: number;
            }[];
            role: import(".prisma/client").$Enums.MembershipRole;
            name: string | null;
            id: number;
            email: string;
            timeZone: string;
            bio: string | null;
            schedules: {
                name: string;
                id: number;
            }[];
            username: string | null;
            avatarUrl: string | null;
        };
    }>;
    updateUser: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userId: number;
            timeZone: string;
            role: "ADMIN" | "MEMBER" | "OWNER";
            username?: string | undefined;
            bio?: string | undefined;
            name?: string | undefined;
            email?: string | undefined;
            avatar?: string | undefined;
            attributeOptions?: {
                userId: number;
                attributes: {
                    id: string;
                    options?: {
                        value: string;
                        label?: string | undefined;
                    }[] | undefined;
                    value?: string | undefined;
                }[];
            } | undefined;
        };
        output: {
            success: boolean;
        };
    }>;
    getTeams: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            name: string;
            id: number;
        }[];
    }>;
    addMembersToTeams: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userIds: number[];
            teamIds: number[];
        };
        output: {
            success: boolean;
            invitedTotalUsers: number;
        };
    }>;
    addMembersToEventTypes: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userIds: number[];
            teamIds: number[];
            eventTypeIds: number[];
        };
        output: import("@prisma/client/runtime/library").GetBatchResult;
    }>;
    removeHostsFromEventTypes: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userIds: number[];
            eventTypeIds: number[];
        };
        output: import("@prisma/client/runtime/library").GetBatchResult;
    }>;
    bulkDeleteUsers: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userIds: number[];
        };
        output: {
            success: boolean;
            usersDeleted: number;
        };
    }>;
    listOtherTeamMembers: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
            limit: number;
            query?: string | undefined;
            offset?: number | undefined;
            cursor?: number | null | undefined;
        };
        output: {
            rows: {
                bookerUrl: string;
                user: {
                    name: string | null;
                    id: number;
                    email: string;
                    username: string | null;
                    avatarUrl: string | null;
                } & {
                    nonProfileUsername: string | null;
                    profile: import("@calcom/types/UserProfile").UserProfile;
                };
                id: number;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
                accepted: boolean;
            }[];
            nextCursor: number | null | undefined;
        };
    }>;
    getOtherTeam: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
        };
        output: {
            safeBio: string;
            name: string;
            id: number;
            metadata: import(".prisma/client").Prisma.JsonValue;
            slug: string | null;
            parent: {
                id: number;
                slug: string | null;
            } | null;
            logoUrl: string | null;
            bio: string | null;
            isPrivate: boolean;
        };
    }>;
    listOtherTeams: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            name: string;
            id: number;
            createdAt: Date;
            metadata: import(".prisma/client").Prisma.JsonValue;
            timeZone: string;
            slug: string | null;
            parentId: number | null;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            bio: string | null;
            hideBranding: boolean;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            bannerUrl: string | null;
            timeFormat: number | null;
            weekStart: string;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
        }[];
    }>;
    deleteTeam: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
        };
        output: void;
    }>;
    adminGetAll: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
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
            organizationSettings: {
                id: number;
                organizationId: number;
                isOrganizationConfigured: boolean;
                isOrganizationVerified: boolean;
                orgAutoAcceptEmail: string;
                lockEventTypeCreationForUsers: boolean;
                adminGetsNoSlotsNotification: boolean;
                isAdminReviewed: boolean;
                isAdminAPIEnabled: boolean;
            } | null;
            name: string;
            id: number;
            slug: string | null;
            members: {
                user: {
                    name: string | null;
                    id: number;
                    email: string;
                };
            }[];
        }[];
    }>;
    adminGet: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            id: number;
        };
        output: {
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
            organizationSettings: {
                isOrganizationConfigured: boolean;
                isOrganizationVerified: boolean;
                orgAutoAcceptEmail: string;
            } | null;
            name: string;
            id: number;
            slug: string | null;
            isOrganization: boolean;
            members: {
                user: {
                    name: string | null;
                    id: number;
                    email: string;
                };
            }[];
        };
    }>;
    adminUpdate: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
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
        };
        output: {
            name: string;
            id: number;
            createdAt: Date;
            metadata: import(".prisma/client").Prisma.JsonValue;
            timeZone: string;
            slug: string | null;
            parentId: number | null;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            bio: string | null;
            hideBranding: boolean;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            bannerUrl: string | null;
            timeFormat: number | null;
            weekStart: string;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
        };
    }>;
    adminVerify: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            orgId: number;
        };
        output: {
            ok: boolean;
            message: string;
        };
    }>;
    adminDelete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            orgId: number;
        };
        output: {
            ok: boolean;
            message: string;
        };
    }>;
    createPhoneCall: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            eventTypeId: number;
            templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
            yourPhoneNumber: string;
            numberToCall: string;
            calApiKey: string;
            enabled?: boolean | undefined;
            schedulerName?: string | null | undefined;
            guestName?: string | undefined;
            guestEmail?: string | undefined;
            guestCompany?: string | undefined;
            beginMessage?: string | undefined;
            generalPrompt?: string | undefined;
        };
        output: import("zod").objectOutputType<{
            call_id: import("zod").ZodString;
            agent_id: import("zod").ZodString;
        }, import("zod").ZodTypeAny, "passthrough">;
    }>;
}>;
