export declare const viewerTeamsRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    get: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
            isOrg?: boolean | undefined;
        };
        output: {
            members: {
                username: string | null;
                role: import(".prisma/client").$Enums.MembershipRole;
                profile: import("@calcom/types/UserProfile").UserProfile;
                organizationId: number | null;
                organization: any;
                accepted: boolean;
                disableImpersonation: boolean;
                subteams: (string | null)[] | null;
                bookerUrl: string;
                connectedApps: {
                    name: any;
                    logo: any;
                    app: {
                        slug: string;
                        categories: import(".prisma/client").$Enums.AppCategories[];
                    } | null;
                    externalId: string | null;
                }[] | null;
                name: string | null;
                id: number;
                email: string;
                bio: string | null;
                teams: {
                    team: {
                        id: number;
                        slug: string | null;
                    };
                }[];
                avatarUrl: string | null;
                nonProfileUsername: string | null;
            }[];
            safeBio: string;
            membership: {
                role: import(".prisma/client").$Enums.MembershipRole;
                accepted: boolean;
            };
            inviteToken: {
                token: string;
                identifier: string;
                expires: Date;
                expiresInDays: number | null;
            } | undefined;
            metadata: {
                requestedSlug?: string | null | undefined;
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
            eventTypes: {
                metadata: {
                    smartContractAddress?: string | undefined;
                    blockchainId?: number | undefined;
                    multipleDuration?: number[] | undefined;
                    giphyThankYouPage?: string | undefined;
                    apps?: {
                        alby?: {
                            price: number;
                            currency: string;
                            appCategories?: string[] | undefined;
                            paymentOption?: string | undefined;
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                        } | undefined;
                        basecamp3?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        campsite?: {} | undefined;
                        closecom?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        dailyvideo?: {} | undefined;
                        fathom?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            trackingId?: string | undefined;
                        } | undefined;
                        feishucalendar?: {} | undefined;
                        ga4?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            trackingId?: string | undefined;
                        } | undefined;
                        giphy?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            thankYouPage?: string | undefined;
                        } | undefined;
                        googlecalendar?: {} | undefined;
                        googlevideo?: {} | undefined;
                        gtm?: {
                            trackingId: string;
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        hubspot?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        intercom?: {} | undefined;
                        jelly?: {} | undefined;
                        jitsivideo?: {} | undefined;
                        larkcalendar?: {} | undefined;
                        make?: {} | undefined;
                        matomo?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            MATOMO_URL?: string | undefined;
                            SITE_ID?: string | undefined;
                        } | undefined;
                        metapixel?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            trackingId?: string | undefined;
                        } | undefined;
                        "mock-payment-app"?: {
                            price: number;
                            currency: string;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            paymentOption?: string | undefined;
                            enabled?: boolean | undefined;
                        } | undefined;
                        office365calendar?: {
                            client_id: string;
                            client_secret: string;
                        } | undefined;
                        office365video?: {
                            client_id: string;
                            client_secret: string;
                        } | undefined;
                        paypal?: {
                            price: number;
                            currency: string;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            paymentOption?: string | undefined;
                            enabled?: boolean | undefined;
                        } | undefined;
                        "pipedrive-crm"?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        plausible?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            PLAUSIBLE_URL?: string | undefined;
                            trackingId?: string | undefined;
                        } | undefined;
                        posthog?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            TRACKING_ID?: string | undefined;
                            API_HOST?: string | undefined;
                        } | undefined;
                        qr_code?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        "routing-forms"?: any;
                        salesforce?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            roundRobinLeadSkip?: boolean | undefined;
                            skipContactCreation?: boolean | undefined;
                        } | undefined;
                        shimmervideo?: {} | undefined;
                        stripe?: {
                            price: number;
                            currency: string;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            paymentOption?: string | undefined;
                            enabled?: boolean | undefined;
                        } | undefined;
                        tandemvideo?: {} | undefined;
                        "booking-pages-tag"?: {
                            trackingId: string;
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        "event-type-app-card"?: {
                            isSunrise: boolean;
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        twipla?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            SITE_ID?: string | undefined;
                        } | undefined;
                        umami?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                            SITE_ID?: string | undefined;
                            SCRIPT_URL?: string | undefined;
                        } | undefined;
                        vital?: {} | undefined;
                        webex?: {} | undefined;
                        wordpress?: {
                            isSunrise: boolean;
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        zapier?: {} | undefined;
                        "zoho-bigin"?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        zohocalendar?: {} | undefined;
                        zohocrm?: {
                            enabled?: boolean | undefined;
                            credentialId?: number | undefined;
                            appCategories?: string[] | undefined;
                        } | undefined;
                        zoomvideo?: {} | undefined;
                    } | undefined;
                    additionalNotesRequired?: boolean | undefined;
                    disableSuccessPage?: boolean | undefined;
                    disableStandardEmails?: {
                        all?: {
                            host?: boolean | undefined;
                            attendee?: boolean | undefined;
                        } | undefined;
                        confirmation?: {
                            host?: boolean | undefined;
                            attendee?: boolean | undefined;
                        } | undefined;
                    } | undefined;
                    managedEventConfig?: {
                        unlockedFields?: {
                            length?: true | undefined;
                            destinationCalendar?: true | undefined;
                            profile?: true | undefined;
                            team?: true | undefined;
                            schedule?: true | undefined;
                            availability?: true | undefined;
                            hashedLink?: true | undefined;
                            secondaryEmail?: true | undefined;
                            userId?: true | undefined;
                            title?: true | undefined;
                            description?: true | undefined;
                            customInputs?: true | undefined;
                            metadata?: true | undefined;
                            timeZone?: true | undefined;
                            slug?: true | undefined;
                            position?: true | undefined;
                            locations?: true | undefined;
                            offsetStart?: true | undefined;
                            hidden?: true | undefined;
                            profileId?: true | undefined;
                            teamId?: true | undefined;
                            eventName?: true | undefined;
                            parentId?: true | undefined;
                            bookingFields?: true | undefined;
                            periodType?: true | undefined;
                            periodStartDate?: true | undefined;
                            periodEndDate?: true | undefined;
                            periodDays?: true | undefined;
                            periodCountCalendarDays?: true | undefined;
                            lockTimeZoneToggleOnBookingPage?: true | undefined;
                            requiresConfirmation?: true | undefined;
                            requiresConfirmationWillBlockSlot?: true | undefined;
                            requiresBookerEmailVerification?: true | undefined;
                            recurringEvent?: true | undefined;
                            disableGuests?: true | undefined;
                            hideCalendarNotes?: true | undefined;
                            minimumBookingNotice?: true | undefined;
                            beforeEventBuffer?: true | undefined;
                            afterEventBuffer?: true | undefined;
                            seatsPerTimeSlot?: true | undefined;
                            onlyShowFirstAvailableSlot?: true | undefined;
                            seatsShowAttendees?: true | undefined;
                            seatsShowAvailabilityCount?: true | undefined;
                            schedulingType?: true | undefined;
                            scheduleId?: true | undefined;
                            price?: true | undefined;
                            currency?: true | undefined;
                            slotInterval?: true | undefined;
                            successRedirectUrl?: true | undefined;
                            forwardParamsSuccessRedirect?: true | undefined;
                            bookingLimits?: true | undefined;
                            durationLimits?: true | undefined;
                            isInstantEvent?: true | undefined;
                            instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                            instantMeetingScheduleId?: true | undefined;
                            assignAllTeamMembers?: true | undefined;
                            useEventTypeDestinationCalendarEmail?: true | undefined;
                            isRRWeightsEnabled?: true | undefined;
                            eventTypeColor?: true | undefined;
                            rescheduleWithSameRoundRobinHost?: true | undefined;
                            secondaryEmailId?: true | undefined;
                            hosts?: true | undefined;
                            users?: true | undefined;
                            owner?: true | undefined;
                            bookings?: true | undefined;
                            webhooks?: true | undefined;
                            parent?: true | undefined;
                            children?: true | undefined;
                            workflows?: true | undefined;
                            instantMeetingSchedule?: true | undefined;
                            aiPhoneCallConfig?: true | undefined;
                            _count?: true | undefined;
                        } | undefined;
                    } | undefined;
                    requiresConfirmationThreshold?: {
                        time: number;
                        unit: "days" | "milliseconds" | "seconds" | "minutes" | "hours" | "months" | "years" | "dates";
                    } | undefined;
                    config?: {
                        useHostSchedulesForTeamEvent?: boolean | undefined;
                    } | undefined;
                    bookerLayouts?: {
                        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
                    } | null | undefined;
                } | null;
                users: ({
                    name: string | null;
                    id: number;
                    email: string;
                    bio: string | null;
                    credentials: {
                        app: {
                            slug: string;
                            categories: import(".prisma/client").$Enums.AppCategories[];
                        } | null;
                        destinationCalendars: {
                            externalId: string;
                        }[];
                    }[];
                    teams: {
                        team: {
                            id: number;
                            slug: string | null;
                        };
                    }[];
                    username: string | null;
                    avatarUrl: string | null;
                } & {
                    nonProfileUsername: string | null;
                    profile: import("@calcom/types/UserProfile").UserProfile;
                })[];
                length: number;
                id: number;
                title: string;
                description: string | null;
                slug: string;
                hidden: boolean;
                lockTimeZoneToggleOnBookingPage: boolean;
                requiresConfirmation: boolean;
                requiresBookerEmailVerification: boolean;
                recurringEvent: import(".prisma/client").Prisma.JsonValue;
                schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                price: number;
                currency: string;
                hosts: {
                    user: {
                        name: string | null;
                        id: number;
                        email: string;
                        bio: string | null;
                        credentials: {
                            app: {
                                slug: string;
                                categories: import(".prisma/client").$Enums.AppCategories[];
                            } | null;
                            destinationCalendars: {
                                externalId: string;
                            }[];
                        }[];
                        teams: {
                            team: {
                                id: number;
                                slug: string | null;
                            };
                        }[];
                        username: string | null;
                        avatarUrl: string | null;
                    };
                }[];
            }[] | null;
            logo?: string | undefined;
            name: string;
            id: number;
            slug: string | null;
            parentId: number | null;
            parent: {
                name: string;
                id: number;
                metadata: import(".prisma/client").Prisma.JsonValue;
                slug: string | null;
                logoUrl: string | null;
                isPrivate: boolean;
                isOrganization: boolean;
            } | null;
            children: {
                name: string;
                slug: string | null;
            }[];
            logoUrl: string | null;
            bio: string | null;
            hideBranding: boolean;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            isOrganization: boolean;
        };
    }>;
    getMinimal: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
            isOrg?: boolean | undefined;
        };
        output: {
            membership: {
                role: import(".prisma/client").$Enums.MembershipRole;
                accepted: boolean;
            };
            inviteToken: {
                token: string;
                identifier: string;
                expires: Date;
                expiresInDays: number | null;
            } | undefined;
            metadata: {
                requestedSlug?: string | null | undefined;
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
            logo?: string | undefined;
            name: string;
            id: number;
            slug: string | null;
            parentId: number | null;
            parent: {
                name: string;
                id: number;
                metadata: import(".prisma/client").Prisma.JsonValue;
                slug: string | null;
                logoUrl: string | null;
                isPrivate: boolean;
                isOrganization: boolean;
            } | null;
            children: {
                name: string;
                slug: string | null;
            }[];
            logoUrl: string | null;
            bio: string | null;
            hideBranding: boolean;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            isOrganization: boolean;
        };
    }>;
    list: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            includeOrgs?: boolean | undefined;
        } | undefined;
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
            inviteToken: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                teamId: number | null;
                secondaryEmailId: number | null;
                token: string;
                identifier: string;
                expires: Date;
                expiresInDays: number | null;
            } | undefined;
            name: string;
            id: number;
            slug: string | null;
            parentId: number | null;
            parent: {
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
            } | null;
            logoUrl: string | null;
            isOrganization: boolean;
            role: import(".prisma/client").$Enums.MembershipRole;
            accepted: boolean;
        }[];
    }>;
    listOwnedTeams: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
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
            inviteToken: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                teamId: number | null;
                secondaryEmailId: number | null;
                token: string;
                identifier: string;
                expires: Date;
                expiresInDays: number | null;
            } | undefined;
            name: string;
            id: number;
            slug: string | null;
            parentId: number | null;
            parent: {
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
            } | null;
            logoUrl: string | null;
            isOrganization: boolean;
            role: import(".prisma/client").$Enums.MembershipRole;
            accepted: boolean;
        }[];
    }>;
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            name: string;
            slug: string;
            logo?: string | null | undefined;
        };
        output: {
            url: string;
            message: string;
            team: null;
        } | {
            url: string;
            message: string;
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
        };
    }>;
    update: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
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
        };
        output: {
            logoUrl: string | null;
            name: string;
            bio: string | null;
            slug: string | null;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
        } | undefined;
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
        };
        output: void;
    }>;
    removeMember: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamIds: number[];
            memberIds: number[];
            isOrg?: boolean | undefined;
        };
        output: void;
    }>;
    inviteMember: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
            language: string;
            usernameOrEmail: (string | (string | {
                email: string;
                role: "ADMIN" | "MEMBER" | "OWNER";
            })[]) & (string | (string | {
                email: string;
                role: "ADMIN" | "MEMBER" | "OWNER";
            })[] | undefined);
            role?: "ADMIN" | "MEMBER" | "OWNER" | undefined;
        };
        output: {
            usernameOrEmail: string | string[];
            numUsersInvited: number;
        };
    }>;
    acceptOrLeave: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
            accept: boolean;
        };
        output: void;
    }>;
    changeMemberRole: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
            role: "ADMIN" | "MEMBER" | "OWNER";
            memberId: number;
        };
        output: void;
    }>;
    getMemberAvailability: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
            dateFrom: string;
            dateTo: string;
            memberId: number;
            timezone: string;
        };
        output: {
            busy: import("@calcom/types/Calendar").EventBusyDetails[];
            timeZone: string;
            dateRanges: import("@calcom/lib/date-ranges").DateRange[];
            oooExcludedDateRanges: import("@calcom/lib/date-ranges").DateRange[];
            workingHours: import("@calcom/types/schedule").WorkingHours[];
            dateOverrides: import("@calcom/types/schedule").TimeRange[];
            currentSeats: {
                uid: string;
                startTime: Date;
                _count: {
                    attendees: number;
                };
            }[] | null;
            datesOutOfOffice: import("@calcom/core/getUserAvailability").IOutOfOfficeData;
        };
    }>;
    getMembershipbyUser: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
            memberId: number;
        };
        output: {
            id: number;
            userId: number;
            teamId: number;
            role: import(".prisma/client").$Enums.MembershipRole;
            disableImpersonation: boolean;
            accepted: boolean;
        } | null;
    }>;
    updateMembership: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
            disableImpersonation: boolean;
            memberId: number;
        };
        output: {
            id: number;
            userId: number;
            teamId: number;
            role: import(".prisma/client").$Enums.MembershipRole;
            disableImpersonation: boolean;
            accepted: boolean;
        };
    }>;
    publish: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
        };
        output: {
            url: string;
            message: string;
        };
    }>;
    /** This is a temporal endpoint so we can progressively upgrade teams to the new billing system. */
    getUpgradeable: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: ({
            team: {
                children: {
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
            } & {
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
    listMembers: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamIds?: number[] | undefined;
        };
        output: ({
            name: string | null;
            id: number;
            username: string | null;
            avatarUrl: string | null;
        } & {
            accepted: boolean;
        } & {
            nonProfileUsername: string | null;
            profile: import("@calcom/types/UserProfile").UserProfile;
        })[];
    }>;
    lazyLoadMembers: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
            limit?: number | undefined;
            searchTerm?: string | undefined;
            cursor?: number | null | undefined;
        };
        output: {
            members: {
                username: string | null;
                role: import(".prisma/client").$Enums.MembershipRole;
                profile: import("@calcom/types/UserProfile").UserProfile;
                organizationId: number | null;
                organization: any;
                accepted: boolean;
                disableImpersonation: boolean;
                bookerUrl: string;
                name: string | null;
                id: number;
                email: string;
                bio: string | null;
                avatarUrl: string | null;
                nonProfileUsername: string | null;
            }[];
            nextCursor: number | undefined;
        };
    }>;
    getUserConnectedApps: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number;
            userIds: number[];
        };
        output: Record<number, {
            name: string | null;
            logo: string | null;
            externalId: string | null;
            app: {
                slug: string;
                categories: import("@calcom/prisma/enums").AppCategories[];
            } | null;
        }[]>;
    }>;
    hasTeamPlan: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            hasTeamPlan: boolean;
        };
    }>;
    listInvites: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: number;
            userId: number;
            teamId: number;
            role: import(".prisma/client").$Enums.MembershipRole;
            disableImpersonation: boolean;
            accepted: boolean;
        }[];
    }>;
    createInvite: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number;
            token?: string | undefined;
        };
        output: {
            token: string;
            inviteLink: string;
        };
    }>;
    setInviteExpiration: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            token: string;
            expiresInDays?: number | undefined;
        };
        output: void;
    }>;
    deleteInvite: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            token: string;
        };
        output: void;
    }>;
    inviteMemberByToken: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            token: string;
        };
        output: string;
    }>;
    hasEditPermissionForUser: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            memberId: number;
        };
        output: boolean;
    }>;
    resendInvitation: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            email: string;
            teamId: number;
            language: string;
            isOrg?: boolean | undefined;
        };
        output: {
            email: string;
            teamId: number;
            language: string;
            isOrg: boolean;
        };
    }>;
    roundRobinReassign: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            bookingId: number;
            teamId: number;
        };
        output: void;
    }>;
    checkIfMembershipExists: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            value: string;
            teamId: number;
        };
        output: boolean;
    }>;
}>;
