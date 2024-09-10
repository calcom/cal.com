import { z } from "zod";
export declare const eventTypesRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    getByViewer: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            filters?: {
                teamIds?: number[] | undefined;
                upIds?: string[] | undefined;
                schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
            } | undefined;
            forRoutingForms?: boolean | undefined;
        } | null | undefined;
        output: {
            allUsersAcrossAllEventTypes: Map<number, {
                id: number;
                name: string | null;
                username: string | null;
                avatarUrl: string | null;
            } & {
                nonProfileUsername: string | null;
                profile: import("@calcom/types/UserProfile").UserProfile;
            }>;
            eventTypeGroups: {
                eventTypes: {
                    userIds: number[];
                    safeDescription: string | undefined;
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
                                title?: true | undefined;
                                slug?: true | undefined;
                                description?: true | undefined;
                                position?: true | undefined;
                                locations?: true | undefined;
                                offsetStart?: true | undefined;
                                hidden?: true | undefined;
                                userId?: true | undefined;
                                profileId?: true | undefined;
                                teamId?: true | undefined;
                                eventName?: true | undefined;
                                parentId?: true | undefined;
                                bookingFields?: true | undefined;
                                timeZone?: true | undefined;
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
                                metadata?: true | undefined;
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
                                profile?: true | undefined;
                                team?: true | undefined;
                                hashedLink?: true | undefined;
                                bookings?: true | undefined;
                                availability?: true | undefined;
                                webhooks?: true | undefined;
                                destinationCalendar?: true | undefined;
                                customInputs?: true | undefined;
                                parent?: true | undefined;
                                children?: true | undefined;
                                schedule?: true | undefined;
                                workflows?: true | undefined;
                                instantMeetingSchedule?: true | undefined;
                                aiPhoneCallConfig?: true | undefined;
                                secondaryEmail?: true | undefined;
                                _count?: true | undefined;
                            } | undefined;
                        } | undefined;
                        requiresConfirmationThreshold?: {
                            time: number;
                            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
                        } | undefined;
                        config?: {
                            useHostSchedulesForTeamEvent?: boolean | undefined;
                        } | undefined;
                        bookerLayouts?: {
                            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
                        } | null | undefined;
                    } | null;
                    children: {
                        users: ({
                            id: number;
                            name: string | null;
                            username: string | null;
                            avatarUrl: string | null;
                        } & {
                            nonProfileUsername: string | null;
                            profile: import("@calcom/types/UserProfile").UserProfile;
                        })[];
                        length: number;
                        id: number;
                        title: string;
                        slug: string;
                        description: string | null;
                        position: number;
                        locations: import(".prisma/client").Prisma.JsonValue;
                        offsetStart: number;
                        hidden: boolean;
                        userId: number | null;
                        profileId: number | null;
                        teamId: number | null;
                        eventName: string | null;
                        parentId: number | null;
                        bookingFields: import(".prisma/client").Prisma.JsonValue;
                        timeZone: string | null;
                        periodType: import(".prisma/client").$Enums.PeriodType;
                        periodStartDate: Date | null;
                        periodEndDate: Date | null;
                        periodDays: number | null;
                        periodCountCalendarDays: boolean | null;
                        lockTimeZoneToggleOnBookingPage: boolean;
                        requiresConfirmation: boolean;
                        requiresConfirmationWillBlockSlot: boolean;
                        requiresBookerEmailVerification: boolean;
                        recurringEvent: import(".prisma/client").Prisma.JsonValue;
                        disableGuests: boolean;
                        hideCalendarNotes: boolean;
                        minimumBookingNotice: number;
                        beforeEventBuffer: number;
                        afterEventBuffer: number;
                        seatsPerTimeSlot: number | null;
                        onlyShowFirstAvailableSlot: boolean;
                        seatsShowAttendees: boolean | null;
                        seatsShowAvailabilityCount: boolean | null;
                        schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                        scheduleId: number | null;
                        price: number;
                        currency: string;
                        slotInterval: number | null;
                        metadata: import(".prisma/client").Prisma.JsonValue;
                        successRedirectUrl: string | null;
                        forwardParamsSuccessRedirect: boolean | null;
                        bookingLimits: import(".prisma/client").Prisma.JsonValue;
                        durationLimits: import(".prisma/client").Prisma.JsonValue;
                        isInstantEvent: boolean;
                        instantMeetingExpiryTimeOffsetInSeconds: number;
                        instantMeetingScheduleId: number | null;
                        assignAllTeamMembers: boolean;
                        useEventTypeDestinationCalendarEmail: boolean;
                        isRRWeightsEnabled: boolean;
                        eventTypeColor: import(".prisma/client").Prisma.JsonValue;
                        rescheduleWithSameRoundRobinHost: boolean;
                        secondaryEmailId: number | null;
                    }[];
                    length: number;
                    id: number;
                    title: string;
                    slug: string;
                    description: string | null;
                    position: number;
                    locations: import(".prisma/client").Prisma.JsonValue;
                    offsetStart: number;
                    hidden: boolean;
                    userId: number | null;
                    profileId: number | null;
                    teamId: number | null;
                    eventName: string | null;
                    parentId: number | null;
                    bookingFields: import(".prisma/client").Prisma.JsonValue;
                    timeZone: string | null;
                    periodType: import(".prisma/client").$Enums.PeriodType;
                    periodStartDate: Date | null;
                    periodEndDate: Date | null;
                    periodDays: number | null;
                    periodCountCalendarDays: boolean | null;
                    lockTimeZoneToggleOnBookingPage: boolean;
                    requiresConfirmation: boolean;
                    requiresConfirmationWillBlockSlot: boolean;
                    requiresBookerEmailVerification: boolean;
                    recurringEvent: import(".prisma/client").Prisma.JsonValue;
                    disableGuests: boolean;
                    hideCalendarNotes: boolean;
                    minimumBookingNotice: number;
                    beforeEventBuffer: number;
                    afterEventBuffer: number;
                    seatsPerTimeSlot: number | null;
                    onlyShowFirstAvailableSlot: boolean;
                    seatsShowAttendees: boolean | null;
                    seatsShowAvailabilityCount: boolean | null;
                    schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                    scheduleId: number | null;
                    price: number;
                    currency: string;
                    slotInterval: number | null;
                    successRedirectUrl: string | null;
                    bookingLimits: import(".prisma/client").Prisma.JsonValue;
                    durationLimits: import(".prisma/client").Prisma.JsonValue;
                    isInstantEvent: boolean;
                    instantMeetingExpiryTimeOffsetInSeconds: number;
                    instantMeetingScheduleId: number | null;
                    assignAllTeamMembers: boolean;
                    useEventTypeDestinationCalendarEmail: boolean;
                    isRRWeightsEnabled: boolean;
                    eventTypeColor: import(".prisma/client").Prisma.JsonValue;
                    rescheduleWithSameRoundRobinHost: boolean;
                    secondaryEmailId: number | null;
                    hosts: ({
                        user: {
                            id: number;
                            name: string | null;
                            username: string | null;
                            avatarUrl: string | null;
                        };
                    } & {
                        userId: number;
                        eventTypeId: number;
                        isFixed: boolean;
                        priority: number | null;
                        weight: number | null;
                        weightAdjustment: number | null;
                    })[];
                    hashedLink: {
                        id: number;
                        link: string;
                        eventTypeId: number;
                    } | null;
                    aiPhoneCallConfig: {
                        id: number;
                        eventTypeId: number;
                        enabled: boolean;
                        templateType: string;
                        schedulerName: string | null;
                        generalPrompt: string | null;
                        yourPhoneNumber: string;
                        numberToCall: string;
                        guestName: string | null;
                        guestEmail: string | null;
                        guestCompany: string | null;
                        beginMessage: string | null;
                        llmId: string | null;
                    } | null;
                }[];
                teamId?: number | null | undefined;
                parentId?: number | null | undefined;
                bookerUrl: string;
                membershipRole?: import("@calcom/prisma/enums").MembershipRole | null | undefined;
                profile: {
                    slug: string | null;
                    name: string | null;
                    image: string;
                    eventTypesLockedByOrg?: boolean | undefined;
                };
                metadata: {
                    membershipCount: number;
                    readOnly: boolean;
                };
            }[];
            profiles: {
                teamId: number | null | undefined;
                membershipRole: import("@calcom/prisma/enums").MembershipRole | null | undefined;
                membershipCount: number;
                readOnly: boolean;
                slug: string | null;
                name: string | null;
                image: string;
                eventTypesLockedByOrg?: boolean | undefined;
            }[];
        };
    }>;
    getUserEventGroups: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            filters?: {
                teamIds?: number[] | undefined;
                upIds?: string[] | undefined;
                schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
            } | undefined;
            forRoutingForms?: boolean | undefined;
        } | null | undefined;
        output: {
            eventTypeGroups: {
                teamId?: number | null | undefined;
                parentId?: number | null | undefined;
                bookerUrl: string;
                membershipRole?: import("@calcom/prisma/enums").MembershipRole | null | undefined;
                profile: {
                    slug: string | null;
                    name: string | null;
                    image: string;
                    eventTypesLockedByOrg?: boolean | undefined;
                };
                metadata: {
                    membershipCount: number;
                    readOnly: boolean;
                };
            }[];
            profiles: {
                teamId: number | null | undefined;
                membershipRole: import("@calcom/prisma/enums").MembershipRole | null | undefined;
                membershipCount: number;
                readOnly: boolean;
                slug: string | null;
                name: string | null;
                image: string;
                eventTypesLockedByOrg?: boolean | undefined;
            }[];
        };
    }>;
    getEventTypesFromGroup: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            group: {
                teamId?: number | null | undefined;
                parentId?: number | null | undefined;
            };
            filters?: {
                teamIds?: number[] | undefined;
                upIds?: string[] | undefined;
                schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
            } | undefined;
            forRoutingForms?: boolean | undefined;
            cursor?: number | null | undefined;
            limit?: number | undefined;
        };
        output: {
            eventTypes: {
                safeDescription: string | undefined;
                users: ({
                    id: number;
                    name: string | null;
                    username: string | null;
                    avatarUrl: string | null;
                } & {
                    nonProfileUsername: string | null;
                    profile: import("@calcom/types/UserProfile").UserProfile;
                })[];
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
                            title?: true | undefined;
                            slug?: true | undefined;
                            description?: true | undefined;
                            position?: true | undefined;
                            locations?: true | undefined;
                            offsetStart?: true | undefined;
                            hidden?: true | undefined;
                            userId?: true | undefined;
                            profileId?: true | undefined;
                            teamId?: true | undefined;
                            eventName?: true | undefined;
                            parentId?: true | undefined;
                            bookingFields?: true | undefined;
                            timeZone?: true | undefined;
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
                            metadata?: true | undefined;
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
                            profile?: true | undefined;
                            team?: true | undefined;
                            hashedLink?: true | undefined;
                            bookings?: true | undefined;
                            availability?: true | undefined;
                            webhooks?: true | undefined;
                            destinationCalendar?: true | undefined;
                            customInputs?: true | undefined;
                            parent?: true | undefined;
                            children?: true | undefined;
                            schedule?: true | undefined;
                            workflows?: true | undefined;
                            instantMeetingSchedule?: true | undefined;
                            aiPhoneCallConfig?: true | undefined;
                            secondaryEmail?: true | undefined;
                            _count?: true | undefined;
                        } | undefined;
                    } | undefined;
                    requiresConfirmationThreshold?: {
                        time: number;
                        unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
                    } | undefined;
                    config?: {
                        useHostSchedulesForTeamEvent?: boolean | undefined;
                    } | undefined;
                    bookerLayouts?: {
                        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
                    } | null | undefined;
                } | null;
                children: {
                    users: ({
                        id: number;
                        name: string | null;
                        username: string | null;
                        avatarUrl: string | null;
                    } & {
                        nonProfileUsername: string | null;
                        profile: import("@calcom/types/UserProfile").UserProfile;
                    })[];
                    length: number;
                    id: number;
                    title: string;
                    slug: string;
                    description: string | null;
                    position: number;
                    locations: import(".prisma/client").Prisma.JsonValue;
                    offsetStart: number;
                    hidden: boolean;
                    userId: number | null;
                    profileId: number | null;
                    teamId: number | null;
                    eventName: string | null;
                    parentId: number | null;
                    bookingFields: import(".prisma/client").Prisma.JsonValue;
                    timeZone: string | null;
                    periodType: import(".prisma/client").$Enums.PeriodType;
                    periodStartDate: Date | null;
                    periodEndDate: Date | null;
                    periodDays: number | null;
                    periodCountCalendarDays: boolean | null;
                    lockTimeZoneToggleOnBookingPage: boolean;
                    requiresConfirmation: boolean;
                    requiresConfirmationWillBlockSlot: boolean;
                    requiresBookerEmailVerification: boolean;
                    recurringEvent: import(".prisma/client").Prisma.JsonValue;
                    disableGuests: boolean;
                    hideCalendarNotes: boolean;
                    minimumBookingNotice: number;
                    beforeEventBuffer: number;
                    afterEventBuffer: number;
                    seatsPerTimeSlot: number | null;
                    onlyShowFirstAvailableSlot: boolean;
                    seatsShowAttendees: boolean | null;
                    seatsShowAvailabilityCount: boolean | null;
                    schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                    scheduleId: number | null;
                    price: number;
                    currency: string;
                    slotInterval: number | null;
                    metadata: import(".prisma/client").Prisma.JsonValue;
                    successRedirectUrl: string | null;
                    forwardParamsSuccessRedirect: boolean | null;
                    bookingLimits: import(".prisma/client").Prisma.JsonValue;
                    durationLimits: import(".prisma/client").Prisma.JsonValue;
                    isInstantEvent: boolean;
                    instantMeetingExpiryTimeOffsetInSeconds: number;
                    instantMeetingScheduleId: number | null;
                    assignAllTeamMembers: boolean;
                    useEventTypeDestinationCalendarEmail: boolean;
                    isRRWeightsEnabled: boolean;
                    eventTypeColor: import(".prisma/client").Prisma.JsonValue;
                    rescheduleWithSameRoundRobinHost: boolean;
                    secondaryEmailId: number | null;
                }[];
                length: number;
                id: number;
                title: string;
                slug: string;
                description: string | null;
                position: number;
                locations: import(".prisma/client").Prisma.JsonValue;
                offsetStart: number;
                hidden: boolean;
                userId: number | null;
                profileId: number | null;
                teamId: number | null;
                eventName: string | null;
                parentId: number | null;
                bookingFields: import(".prisma/client").Prisma.JsonValue;
                timeZone: string | null;
                periodType: import(".prisma/client").$Enums.PeriodType;
                periodStartDate: Date | null;
                periodEndDate: Date | null;
                periodDays: number | null;
                periodCountCalendarDays: boolean | null;
                lockTimeZoneToggleOnBookingPage: boolean;
                requiresConfirmation: boolean;
                requiresConfirmationWillBlockSlot: boolean;
                requiresBookerEmailVerification: boolean;
                recurringEvent: import(".prisma/client").Prisma.JsonValue;
                disableGuests: boolean;
                hideCalendarNotes: boolean;
                minimumBookingNotice: number;
                beforeEventBuffer: number;
                afterEventBuffer: number;
                seatsPerTimeSlot: number | null;
                onlyShowFirstAvailableSlot: boolean;
                seatsShowAttendees: boolean | null;
                seatsShowAvailabilityCount: boolean | null;
                schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                scheduleId: number | null;
                price: number;
                currency: string;
                slotInterval: number | null;
                successRedirectUrl: string | null;
                bookingLimits: import(".prisma/client").Prisma.JsonValue;
                durationLimits: import(".prisma/client").Prisma.JsonValue;
                isInstantEvent: boolean;
                instantMeetingExpiryTimeOffsetInSeconds: number;
                instantMeetingScheduleId: number | null;
                assignAllTeamMembers: boolean;
                useEventTypeDestinationCalendarEmail: boolean;
                isRRWeightsEnabled: boolean;
                eventTypeColor: import(".prisma/client").Prisma.JsonValue;
                rescheduleWithSameRoundRobinHost: boolean;
                secondaryEmailId: number | null;
                hosts: ({
                    user: {
                        id: number;
                        name: string | null;
                        username: string | null;
                        avatarUrl: string | null;
                    };
                } & {
                    userId: number;
                    eventTypeId: number;
                    isFixed: boolean;
                    priority: number | null;
                    weight: number | null;
                    weightAdjustment: number | null;
                })[];
                hashedLink: {
                    id: number;
                    link: string;
                    eventTypeId: number;
                } | null;
                aiPhoneCallConfig: {
                    id: number;
                    eventTypeId: number;
                    enabled: boolean;
                    templateType: string;
                    schedulerName: string | null;
                    generalPrompt: string | null;
                    yourPhoneNumber: string;
                    numberToCall: string;
                    guestName: string | null;
                    guestEmail: string | null;
                    guestCompany: string | null;
                    beginMessage: string | null;
                    llmId: string | null;
                } | null;
            }[];
            nextCursor: number | undefined;
        };
    }>;
    getTeamAndEventTypeOptions: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId?: number | undefined;
            isOrg?: boolean | undefined;
        } | null | undefined;
        output: {
            eventTypeOptions: {
                value: string;
                label: string;
            }[];
            teamOptions: {
                value: string;
                label: string;
            }[];
        };
    }>;
    list: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            length: number;
            id: number;
            title: string;
            slug: string;
            description: string | null;
            hidden: boolean;
            schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
            metadata: import(".prisma/client").Prisma.JsonValue;
        }[];
    }>;
    listWithTeam: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: number;
            title: string;
            slug: string;
            team: {
                id: number;
                name: string;
            } | null;
        }[];
    }>;
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            length: number;
            title: string;
            slug: string;
            description?: string | null | undefined;
            locations?: {
                type: string;
                address?: string | undefined;
                link?: string | undefined;
                displayLocationPublicly?: boolean | undefined;
                hostPhoneNumber?: string | undefined;
                credentialId?: number | undefined;
                teamName?: string | undefined;
            }[] | undefined;
            hidden?: boolean | undefined;
            teamId?: number | null | undefined;
            disableGuests?: boolean | undefined;
            minimumBookingNotice?: number | undefined;
            beforeEventBuffer?: number | undefined;
            afterEventBuffer?: number | undefined;
            schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
            scheduleId?: number | undefined;
            slotInterval?: number | null | undefined;
            metadata?: {
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
                        title?: true | undefined;
                        slug?: true | undefined;
                        description?: true | undefined;
                        position?: true | undefined;
                        locations?: true | undefined;
                        offsetStart?: true | undefined;
                        hidden?: true | undefined;
                        userId?: true | undefined;
                        profileId?: true | undefined;
                        teamId?: true | undefined;
                        eventName?: true | undefined;
                        parentId?: true | undefined;
                        bookingFields?: true | undefined;
                        timeZone?: true | undefined;
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
                        metadata?: true | undefined;
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
                        profile?: true | undefined;
                        team?: true | undefined;
                        hashedLink?: true | undefined;
                        bookings?: true | undefined;
                        availability?: true | undefined;
                        webhooks?: true | undefined;
                        destinationCalendar?: true | undefined;
                        customInputs?: true | undefined;
                        parent?: true | undefined;
                        children?: true | undefined;
                        schedule?: true | undefined;
                        workflows?: true | undefined;
                        instantMeetingSchedule?: true | undefined;
                        aiPhoneCallConfig?: true | undefined;
                        secondaryEmail?: true | undefined;
                        _count?: true | undefined;
                    } | undefined;
                } | undefined;
                requiresConfirmationThreshold?: {
                    time: number;
                    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
                } | undefined;
                config?: {
                    useHostSchedulesForTeamEvent?: boolean | undefined;
                } | undefined;
                bookerLayouts?: {
                    enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                    defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
                } | null | undefined;
            } | null | undefined;
        };
        output: {
            eventType: {
                length: number;
                id: number;
                title: string;
                slug: string;
                description: string | null;
                position: number;
                locations: import(".prisma/client").Prisma.JsonValue;
                offsetStart: number;
                hidden: boolean;
                userId: number | null;
                profileId: number | null;
                teamId: number | null;
                eventName: string | null;
                parentId: number | null;
                bookingFields: import(".prisma/client").Prisma.JsonValue;
                timeZone: string | null;
                periodType: import(".prisma/client").$Enums.PeriodType;
                periodStartDate: Date | null;
                periodEndDate: Date | null;
                periodDays: number | null;
                periodCountCalendarDays: boolean | null;
                lockTimeZoneToggleOnBookingPage: boolean;
                requiresConfirmation: boolean;
                requiresConfirmationWillBlockSlot: boolean;
                requiresBookerEmailVerification: boolean;
                recurringEvent: import(".prisma/client").Prisma.JsonValue;
                disableGuests: boolean;
                hideCalendarNotes: boolean;
                minimumBookingNotice: number;
                beforeEventBuffer: number;
                afterEventBuffer: number;
                seatsPerTimeSlot: number | null;
                onlyShowFirstAvailableSlot: boolean;
                seatsShowAttendees: boolean | null;
                seatsShowAvailabilityCount: boolean | null;
                schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                scheduleId: number | null;
                price: number;
                currency: string;
                slotInterval: number | null;
                metadata: import(".prisma/client").Prisma.JsonValue;
                successRedirectUrl: string | null;
                forwardParamsSuccessRedirect: boolean | null;
                bookingLimits: import(".prisma/client").Prisma.JsonValue;
                durationLimits: import(".prisma/client").Prisma.JsonValue;
                isInstantEvent: boolean;
                instantMeetingExpiryTimeOffsetInSeconds: number;
                instantMeetingScheduleId: number | null;
                assignAllTeamMembers: boolean;
                useEventTypeDestinationCalendarEmail: boolean;
                isRRWeightsEnabled: boolean;
                eventTypeColor: import(".prisma/client").Prisma.JsonValue;
                rescheduleWithSameRoundRobinHost: boolean;
                secondaryEmailId: number | null;
            };
        };
    }>;
    get: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            id: number;
            users?: number[] | undefined;
        };
        output: {
            eventType: {
                schedule: number | null;
                instantMeetingSchedule: number | null;
                scheduleName: string | null;
                recurringEvent: import("@calcom/types/Calendar").RecurringEvent | null;
                bookingLimits: Partial<Record<"PER_DAY" | "PER_WEEK" | "PER_MONTH" | "PER_YEAR", number | undefined>> | null;
                durationLimits: Partial<Record<"PER_DAY" | "PER_WEEK" | "PER_MONTH" | "PER_YEAR", number | undefined>> | null;
                eventTypeColor: {
                    lightEventTypeColor: string;
                    darkEventTypeColor: string;
                } | null;
                locations: import("@calcom/app-store/locations").LocationObject[];
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
                            title?: true | undefined;
                            slug?: true | undefined;
                            description?: true | undefined;
                            position?: true | undefined;
                            locations?: true | undefined;
                            offsetStart?: true | undefined;
                            hidden?: true | undefined;
                            userId?: true | undefined;
                            profileId?: true | undefined;
                            teamId?: true | undefined;
                            eventName?: true | undefined;
                            parentId?: true | undefined;
                            bookingFields?: true | undefined;
                            timeZone?: true | undefined;
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
                            metadata?: true | undefined;
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
                            profile?: true | undefined;
                            team?: true | undefined;
                            hashedLink?: true | undefined;
                            bookings?: true | undefined;
                            availability?: true | undefined;
                            webhooks?: true | undefined;
                            destinationCalendar?: true | undefined;
                            customInputs?: true | undefined;
                            parent?: true | undefined;
                            children?: true | undefined;
                            schedule?: true | undefined;
                            workflows?: true | undefined;
                            instantMeetingSchedule?: true | undefined;
                            aiPhoneCallConfig?: true | undefined;
                            secondaryEmail?: true | undefined;
                            _count?: true | undefined;
                        } | undefined;
                    } | undefined;
                    requiresConfirmationThreshold?: {
                        time: number;
                        unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
                    } | undefined;
                    config?: {
                        useHostSchedulesForTeamEvent?: boolean | undefined;
                    } | undefined;
                    bookerLayouts?: {
                        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
                    } | null | undefined;
                };
                customInputs: {
                    type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
                    id: number;
                    eventTypeId: number;
                    label: string;
                    required: boolean;
                    placeholder: string;
                    options?: {
                        type: string;
                        label: string;
                    }[] | null | undefined;
                    hasToBeCreated?: boolean | undefined;
                }[];
                users: {
                    id: number;
                    name: string | null;
                    email: string;
                    username: string | null;
                    locale: string | null;
                    avatarUrl: string | null;
                    defaultScheduleId: number | null;
                }[];
                bookerUrl: string;
                children: {
                    owner: {
                        avatar: string;
                        email: string;
                        name: string;
                        username: string;
                        membership: import(".prisma/client").$Enums.MembershipRole;
                        id: number;
                        avatarUrl: string | null;
                        nonProfileUsername: string | null;
                        profile: import("@calcom/types/UserProfile").UserProfile;
                    };
                    created: boolean;
                    slug: string;
                    hidden: boolean;
                }[];
                length: number;
                id: number;
                title: string;
                slug: string;
                description: string | null;
                offsetStart: number;
                hidden: boolean;
                userId: number | null;
                teamId: number | null;
                eventName: string | null;
                bookingFields: import(".prisma/client").Prisma.JsonValue;
                timeZone: string | null;
                periodType: import(".prisma/client").$Enums.PeriodType;
                periodStartDate: Date | null;
                periodEndDate: Date | null;
                periodDays: number | null;
                periodCountCalendarDays: boolean | null;
                lockTimeZoneToggleOnBookingPage: boolean;
                requiresConfirmation: boolean;
                requiresConfirmationWillBlockSlot: boolean;
                requiresBookerEmailVerification: boolean;
                disableGuests: boolean;
                hideCalendarNotes: boolean;
                minimumBookingNotice: number;
                beforeEventBuffer: number;
                afterEventBuffer: number;
                seatsPerTimeSlot: number | null;
                onlyShowFirstAvailableSlot: boolean;
                seatsShowAttendees: boolean | null;
                seatsShowAvailabilityCount: boolean | null;
                schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                price: number;
                currency: string;
                slotInterval: number | null;
                successRedirectUrl: string | null;
                forwardParamsSuccessRedirect: boolean | null;
                isInstantEvent: boolean;
                instantMeetingExpiryTimeOffsetInSeconds: number;
                assignAllTeamMembers: boolean;
                useEventTypeDestinationCalendarEmail: boolean;
                isRRWeightsEnabled: boolean;
                rescheduleWithSameRoundRobinHost: boolean;
                secondaryEmailId: number | null;
                hosts: {
                    userId: number;
                    isFixed: boolean;
                    priority: number | null;
                    weight: number | null;
                    weightAdjustment: number | null;
                }[];
                owner: {
                    id: number;
                } | null;
                team: {
                    id: number;
                    slug: string | null;
                    parentId: number | null;
                    parent: {
                        slug: string | null;
                        organizationSettings: {
                            lockEventTypeCreationForUsers: boolean;
                        } | null;
                    } | null;
                    name: string;
                    members: {
                        user: {
                            id: number;
                            name: string | null;
                            email: string;
                            username: string | null;
                            locale: string | null;
                            avatarUrl: string | null;
                            defaultScheduleId: number | null;
                            eventTypes: {
                                slug: string;
                            }[];
                        };
                        role: import(".prisma/client").$Enums.MembershipRole;
                        accepted: boolean;
                    }[];
                } | null;
                hashedLink: {
                    id: number;
                    link: string;
                    eventTypeId: number;
                } | null;
                webhooks: {
                    id: string;
                    eventTypeId: number | null;
                    subscriberUrl: string;
                    payloadTemplate: string | null;
                    active: boolean;
                    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
                    secret: string | null;
                }[];
                destinationCalendar: {
                    id: number;
                    userId: number | null;
                    credentialId: number | null;
                    eventTypeId: number | null;
                    externalId: string;
                    integration: string;
                    primaryEmail: string | null;
                } | null;
                parent: {
                    id: number;
                    teamId: number | null;
                } | null;
                workflows: ({
                    workflow: {
                        id: number;
                        userId: number | null;
                        teamId: number | null;
                        team: {
                            id: number;
                            slug: string | null;
                            name: string;
                            members: {
                                id: number;
                                userId: number;
                                teamId: number;
                                role: import(".prisma/client").$Enums.MembershipRole;
                                disableImpersonation: boolean;
                                accepted: boolean;
                            }[];
                        } | null;
                        time: number | null;
                        name: string;
                        trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
                        timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
                        activeOn: {
                            eventType: {
                                id: number;
                                title: string;
                                parentId: number | null;
                                _count: {
                                    children: number;
                                };
                            };
                        }[];
                        steps: {
                            id: number;
                            workflowId: number;
                            stepNumber: number;
                            action: import(".prisma/client").$Enums.WorkflowActions;
                            sendTo: string | null;
                            reminderBody: string | null;
                            emailSubject: string | null;
                            template: import(".prisma/client").$Enums.WorkflowTemplates;
                            numberRequired: boolean | null;
                            sender: string | null;
                            numberVerificationPending: boolean;
                            includeCalendarEvent: boolean;
                        }[];
                    };
                } & {
                    id: number;
                    eventTypeId: number;
                    workflowId: number;
                })[];
                aiPhoneCallConfig: {
                    id: number;
                    eventTypeId: number;
                    enabled: boolean;
                    templateType: string;
                    schedulerName: string | null;
                    generalPrompt: string | null;
                    yourPhoneNumber: string;
                    numberToCall: string;
                    guestName: string | null;
                    guestEmail: string | null;
                    guestCompany: string | null;
                    beginMessage: string | null;
                    llmId: string | null;
                } | null;
            } & {
                users: ({
                    id: number;
                    name: string | null;
                    email: string;
                    username: string | null;
                    locale: string | null;
                    avatarUrl: string | null;
                    defaultScheduleId: number | null;
                } & {
                    avatar: string;
                })[];
                periodStartDate: string | null;
                periodEndDate: string | null;
                bookingFields: {
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    name: string;
                    label?: string | undefined;
                    options?: {
                        label: string;
                        value: string;
                    }[] | undefined;
                    maxLength?: number | undefined;
                    defaultLabel?: string | undefined;
                    defaultPlaceholder?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    getOptionsAt?: string | undefined;
                    optionsInputs?: Record<string, {
                        type: "text" | "phone" | "address";
                        required?: boolean | undefined;
                        placeholder?: string | undefined;
                    }> | undefined;
                    minLength?: number | undefined;
                    variant?: string | undefined;
                    variantsConfig?: {
                        variants: Record<string, {
                            fields: {
                                type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                                name: string;
                                label?: string | undefined;
                                maxLength?: number | undefined;
                                labelAsSafeHtml?: string | undefined;
                                placeholder?: string | undefined;
                                required?: boolean | undefined;
                                minLength?: number | undefined;
                            }[];
                        }>;
                    } | undefined;
                    views?: {
                        label: string;
                        id: string;
                        description?: string | undefined;
                    }[] | undefined;
                    hideWhenJustOneOption?: boolean | undefined;
                    hidden?: boolean | undefined;
                    editable?: "user" | "system" | "system-but-optional" | "system-but-hidden" | "user-readonly" | undefined;
                    sources?: {
                        label: string;
                        type: string;
                        id: string;
                        editUrl?: string | undefined;
                        fieldRequired?: boolean | undefined;
                    }[] | undefined;
                    disableOnPrefill?: boolean | undefined;
                }[] & z.BRAND<"HAS_SYSTEM_FIELDS">;
            };
            locationOptions: {
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
            destinationCalendar: {
                id: number;
                userId: number | null;
                credentialId: number | null;
                eventTypeId: number | null;
                externalId: string;
                integration: string;
                primaryEmail: string | null;
            } | null;
            team: {
                id: number;
                slug: string | null;
                parentId: number | null;
                parent: {
                    slug: string | null;
                    organizationSettings: {
                        lockEventTypeCreationForUsers: boolean;
                    } | null;
                } | null;
                name: string;
                members: {
                    user: {
                        id: number;
                        name: string | null;
                        email: string;
                        username: string | null;
                        locale: string | null;
                        avatarUrl: string | null;
                        defaultScheduleId: number | null;
                        eventTypes: {
                            slug: string;
                        }[];
                    };
                    role: import(".prisma/client").$Enums.MembershipRole;
                    accepted: boolean;
                }[];
            } | null;
            teamMembers: {
                profileId: number | null;
                eventTypes: string[];
                membership: import(".prisma/client").$Enums.MembershipRole;
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                locale: string | null;
                avatarUrl: string | null;
                defaultScheduleId: number | null;
                nonProfileUsername: string | null;
                profile: import("@calcom/types/UserProfile").UserProfile;
                avatar: string;
            }[];
            currentUserMembership: {
                user: {
                    id: number;
                    name: string | null;
                    email: string;
                    username: string | null;
                    locale: string | null;
                    avatarUrl: string | null;
                    defaultScheduleId: number | null;
                    eventTypes: {
                        slug: string;
                    }[];
                };
                role: import(".prisma/client").$Enums.MembershipRole;
                accepted: boolean;
            } | null;
            isUserOrganizationAdmin: boolean;
        };
    }>;
    update: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: number;
            users?: (number[] & (string | number)[]) | undefined;
            length?: number | undefined;
            title?: string | undefined;
            slug?: string | undefined;
            description?: string | null | undefined;
            position?: number | undefined;
            locations?: {
                type: string;
                address?: string | undefined;
                link?: string | undefined;
                displayLocationPublicly?: boolean | undefined;
                hostPhoneNumber?: string | undefined;
                credentialId?: number | undefined;
                teamName?: string | undefined;
            }[] | undefined;
            offsetStart?: number | undefined;
            hidden?: boolean | undefined;
            userId?: number | null | undefined;
            profileId?: number | null | undefined;
            teamId?: number | null | undefined;
            eventName?: string | null | undefined;
            parentId?: number | null | undefined;
            bookingFields?: {
                name: string;
                type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                options?: {
                    value: string;
                    label: string;
                }[] | undefined;
                label?: string | undefined;
                labelAsSafeHtml?: string | undefined;
                defaultLabel?: string | undefined;
                placeholder?: string | undefined;
                defaultPlaceholder?: string | undefined;
                required?: boolean | undefined;
                getOptionsAt?: string | undefined;
                optionsInputs?: Record<string, {
                    type: "text" | "phone" | "address";
                    required?: boolean | undefined;
                    placeholder?: string | undefined;
                }> | undefined;
                minLength?: number | undefined;
                maxLength?: number | undefined;
                variant?: string | undefined;
                variantsConfig?: {
                    variants: Record<string, {
                        fields: {
                            name: string;
                            type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                            label?: string | undefined;
                            labelAsSafeHtml?: string | undefined;
                            placeholder?: string | undefined;
                            required?: boolean | undefined;
                            minLength?: number | undefined;
                            maxLength?: number | undefined;
                        }[];
                    }>;
                } | undefined;
                views?: {
                    label: string;
                    id: string;
                    description?: string | undefined;
                }[] | undefined;
                hideWhenJustOneOption?: boolean | undefined;
                hidden?: boolean | undefined;
                editable?: "user" | "system" | "system-but-optional" | "system-but-hidden" | "user-readonly" | undefined;
                sources?: {
                    type: string;
                    label: string;
                    id: string;
                    editUrl?: string | undefined;
                    fieldRequired?: boolean | undefined;
                }[] | undefined;
                disableOnPrefill?: boolean | undefined;
            }[] | undefined;
            timeZone?: string | null | undefined;
            periodType?: "UNLIMITED" | "ROLLING" | "ROLLING_WINDOW" | "RANGE" | undefined;
            periodStartDate?: Date | null | undefined;
            periodEndDate?: Date | null | undefined;
            periodDays?: number | null | undefined;
            periodCountCalendarDays?: boolean | null | undefined;
            lockTimeZoneToggleOnBookingPage?: boolean | undefined;
            requiresConfirmation?: boolean | undefined;
            requiresConfirmationWillBlockSlot?: boolean | undefined;
            requiresBookerEmailVerification?: boolean | undefined;
            recurringEvent?: {
                interval: number;
                count: number;
                freq: import("@calcom/prisma/zod-utils").Frequency;
                dtstart?: Date | undefined;
                until?: Date | undefined;
                tzid?: string | undefined;
            } | null | undefined;
            disableGuests?: boolean | undefined;
            hideCalendarNotes?: boolean | undefined;
            minimumBookingNotice?: number | undefined;
            beforeEventBuffer?: number | undefined;
            afterEventBuffer?: number | undefined;
            seatsPerTimeSlot?: number | null | undefined;
            onlyShowFirstAvailableSlot?: boolean | undefined;
            seatsShowAttendees?: boolean | null | undefined;
            seatsShowAvailabilityCount?: boolean | null | undefined;
            schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
            scheduleId?: number | null | undefined;
            price?: number | undefined;
            currency?: string | undefined;
            slotInterval?: number | null | undefined;
            metadata?: {
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
                        title?: true | undefined;
                        slug?: true | undefined;
                        description?: true | undefined;
                        position?: true | undefined;
                        locations?: true | undefined;
                        offsetStart?: true | undefined;
                        hidden?: true | undefined;
                        userId?: true | undefined;
                        profileId?: true | undefined;
                        teamId?: true | undefined;
                        eventName?: true | undefined;
                        parentId?: true | undefined;
                        bookingFields?: true | undefined;
                        timeZone?: true | undefined;
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
                        metadata?: true | undefined;
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
                        profile?: true | undefined;
                        team?: true | undefined;
                        hashedLink?: true | undefined;
                        bookings?: true | undefined;
                        availability?: true | undefined;
                        webhooks?: true | undefined;
                        destinationCalendar?: true | undefined;
                        customInputs?: true | undefined;
                        parent?: true | undefined;
                        children?: true | undefined;
                        schedule?: true | undefined;
                        workflows?: true | undefined;
                        instantMeetingSchedule?: true | undefined;
                        aiPhoneCallConfig?: true | undefined;
                        secondaryEmail?: true | undefined;
                        _count?: true | undefined;
                    } | undefined;
                } | undefined;
                requiresConfirmationThreshold?: {
                    time: number;
                    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
                } | undefined;
                config?: {
                    useHostSchedulesForTeamEvent?: boolean | undefined;
                } | undefined;
                bookerLayouts?: {
                    enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                    defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
                } | null | undefined;
            } | null | undefined;
            successRedirectUrl?: string | null | undefined;
            forwardParamsSuccessRedirect?: boolean | null | undefined;
            bookingLimits?: {
                PER_DAY?: number | undefined;
                PER_WEEK?: number | undefined;
                PER_MONTH?: number | undefined;
                PER_YEAR?: number | undefined;
            } | null | undefined;
            durationLimits?: {
                PER_DAY?: number | undefined;
                PER_WEEK?: number | undefined;
                PER_MONTH?: number | undefined;
                PER_YEAR?: number | undefined;
            } | null | undefined;
            isInstantEvent?: boolean | undefined;
            instantMeetingExpiryTimeOffsetInSeconds?: number | undefined;
            instantMeetingScheduleId?: number | null | undefined;
            assignAllTeamMembers?: boolean | undefined;
            useEventTypeDestinationCalendarEmail?: boolean | undefined;
            isRRWeightsEnabled?: boolean | undefined;
            eventTypeColor?: {
                lightEventTypeColor: string;
                darkEventTypeColor: string;
            } | null | undefined;
            rescheduleWithSameRoundRobinHost?: boolean | undefined;
            secondaryEmailId?: number | null | undefined;
            hosts?: {
                userId: number;
                profileId?: number | null | undefined;
                isFixed?: boolean | undefined;
                priority?: number | null | undefined;
                weight?: number | null | undefined;
            }[] | undefined;
            hashedLink?: string | undefined;
            destinationCalendar?: {
                externalId: string;
                integration: string;
            } | null | undefined;
            customInputs?: {
                type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
                id: number;
                eventTypeId: number;
                label: string;
                required: boolean;
                placeholder: string;
                options?: {
                    type: string;
                    label: string;
                }[] | null | undefined;
                hasToBeCreated?: boolean | undefined;
            }[] | undefined;
            children?: {
                hidden: boolean;
                owner: {
                    id: number;
                    name: string;
                    email: string;
                    eventTypeSlugs: string[];
                };
            }[] | undefined;
            schedule?: number | null | undefined;
            instantMeetingSchedule?: number | null | undefined;
            aiPhoneCallConfig?: {
                enabled: boolean;
                templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
                generalPrompt: string;
                beginMessage: string | null;
                yourPhoneNumber?: string | undefined;
                numberToCall?: string | undefined;
                guestName?: string | null | undefined;
                guestEmail?: string | null | undefined;
                guestCompany?: string | null | undefined;
            } | undefined;
            calAiPhoneScript?: string | undefined;
        };
        output: {
            eventType: {
                title: string;
                isRRWeightsEnabled: boolean;
                team: {
                    id: number;
                    slug: string | null;
                    parentId: number | null;
                    parent: {
                        slug: string | null;
                    } | null;
                    name: string;
                    members: {
                        user: {
                            id: number;
                            name: string | null;
                            email: string;
                            eventTypes: {
                                slug: string;
                            }[];
                        };
                        role: import(".prisma/client").$Enums.MembershipRole;
                        accepted: boolean;
                    }[];
                } | null;
                children: {
                    userId: number | null;
                }[];
                workflows: {
                    workflowId: number;
                }[];
                aiPhoneCallConfig: {
                    enabled: boolean;
                    generalPrompt: string | null;
                    beginMessage: string | null;
                    llmId: string | null;
                } | null;
            };
        };
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: number;
            users?: number[] | undefined;
        };
        output: {
            id: number;
        };
    }>;
    duplicate: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: number;
            users?: number[] | undefined;
            length: number;
            title: string;
            slug: string;
            description: string;
            teamId?: number | null | undefined;
        };
        output: {
            eventType: {
                length: number;
                id: number;
                title: string;
                slug: string;
                description: string | null;
                position: number;
                locations: import(".prisma/client").Prisma.JsonValue;
                offsetStart: number;
                hidden: boolean;
                userId: number | null;
                profileId: number | null;
                teamId: number | null;
                eventName: string | null;
                parentId: number | null;
                bookingFields: import(".prisma/client").Prisma.JsonValue;
                timeZone: string | null;
                periodType: import(".prisma/client").$Enums.PeriodType;
                periodStartDate: Date | null;
                periodEndDate: Date | null;
                periodDays: number | null;
                periodCountCalendarDays: boolean | null;
                lockTimeZoneToggleOnBookingPage: boolean;
                requiresConfirmation: boolean;
                requiresConfirmationWillBlockSlot: boolean;
                requiresBookerEmailVerification: boolean;
                recurringEvent: import(".prisma/client").Prisma.JsonValue;
                disableGuests: boolean;
                hideCalendarNotes: boolean;
                minimumBookingNotice: number;
                beforeEventBuffer: number;
                afterEventBuffer: number;
                seatsPerTimeSlot: number | null;
                onlyShowFirstAvailableSlot: boolean;
                seatsShowAttendees: boolean | null;
                seatsShowAvailabilityCount: boolean | null;
                schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
                scheduleId: number | null;
                price: number;
                currency: string;
                slotInterval: number | null;
                metadata: import(".prisma/client").Prisma.JsonValue;
                successRedirectUrl: string | null;
                forwardParamsSuccessRedirect: boolean | null;
                bookingLimits: import(".prisma/client").Prisma.JsonValue;
                durationLimits: import(".prisma/client").Prisma.JsonValue;
                isInstantEvent: boolean;
                instantMeetingExpiryTimeOffsetInSeconds: number;
                instantMeetingScheduleId: number | null;
                assignAllTeamMembers: boolean;
                useEventTypeDestinationCalendarEmail: boolean;
                isRRWeightsEnabled: boolean;
                eventTypeColor: import(".prisma/client").Prisma.JsonValue;
                rescheduleWithSameRoundRobinHost: boolean;
                secondaryEmailId: number | null;
            };
        };
    }>;
    bulkEventFetch: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            eventTypes: {
                logo: string | undefined;
                id: number;
                title: string;
                locations: import(".prisma/client").Prisma.JsonValue;
            }[];
        };
    }>;
    bulkUpdateToDefaultLocation: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            eventTypeIds: number[];
        };
        output: import("@prisma/client/runtime/library").GetBatchResult;
    }>;
}>;
