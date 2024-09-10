export declare const workflowsRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    list: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId?: number | undefined;
            userId?: number | undefined;
        } | undefined;
        output: {
            workflows: import("@calcom/ee/workflows/components/WorkflowListPage").WorkflowType[];
        };
    }>;
    get: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            id: number;
        };
        output: {
            id: number;
            userId: number | null;
            teamId: number | null;
            team: {
                id: number;
                slug: string | null;
                name: string;
                isOrganization: boolean;
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
            isActiveOnAll: boolean;
            trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
            timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
            activeOn: {
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
            }[];
            activeOnTeams: {
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
        } | null;
    }>;
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId?: number | undefined;
        };
        output: {
            workflow: {
                id: number;
                position: number;
                name: string;
                userId: number | null;
                teamId: number | null;
                isActiveOnAll: boolean;
                trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
                time: number | null;
                timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
            };
        };
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: number;
        };
        output: {
            id: number;
        };
    }>;
    update: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: number;
            time: number | null;
            name: string;
            trigger: "BEFORE_EVENT" | "EVENT_CANCELLED" | "NEW_EVENT" | "AFTER_EVENT" | "RESCHEDULE_EVENT";
            timeUnit: "DAY" | "HOUR" | "MINUTE" | null;
            activeOn: number[];
            steps: {
                id: number;
                workflowId: number;
                stepNumber: number;
                action: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
                sendTo: string | null;
                reminderBody: string | null;
                emailSubject: string | null;
                template: "CANCELLED" | "REMINDER" | "CUSTOM" | "RESCHEDULED" | "COMPLETED" | "RATING";
                numberRequired: boolean | null;
                sender: string | null;
                includeCalendarEvent: boolean;
                senderName: string | null;
            }[];
            isActiveOnAll?: boolean | undefined;
        };
        output: {
            workflow: ({
                team: {
                    id: number;
                    slug: string | null;
                    name: string;
                    isOrganization: boolean;
                    members: {
                        id: number;
                        userId: number;
                        teamId: number;
                        role: import(".prisma/client").$Enums.MembershipRole;
                        disableImpersonation: boolean;
                        accepted: boolean;
                    }[];
                } | null;
                activeOn: {
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
                }[];
                activeOnTeams: {
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
            } & {
                id: number;
                position: number;
                userId: number | null;
                teamId: number | null;
                time: number | null;
                name: string;
                isActiveOnAll: boolean;
                trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
                timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
            }) | null;
        };
    }>;
    activateEventType: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            eventTypeId: number;
            workflowId: number;
        };
        output: void;
    }>;
    sendVerificationCode: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            phoneNumber: string;
        };
        output: void;
    }>;
    verifyPhoneNumber: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            code: string;
            phoneNumber: string;
            teamId?: number | undefined;
        };
        output: boolean;
    }>;
    getVerifiedNumbers: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId?: number | undefined;
        };
        output: {
            id: number;
            userId: number | null;
            teamId: number | null;
            phoneNumber: string;
        }[];
    }>;
    getVerifiedEmails: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId?: number | undefined;
        };
        output: string[];
    }>;
    verifyEmailCode: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            code: string;
            email: string;
            teamId?: number | undefined;
        };
        output: true;
    }>;
    getWorkflowActionOptions: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            label: string;
            value: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
            needsTeamsUpgrade: boolean;
        }[];
    }>;
    filteredList: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            filters?: {
                teamIds?: number[] | undefined;
                userIds?: number[] | undefined;
                upIds?: string[] | undefined;
            } | undefined;
        } | null | undefined;
        output: {
            filtered: import("@calcom/ee/workflows/components/WorkflowListPage").WorkflowType[];
            totalCount: number;
        } | undefined;
    }>;
    getAllActiveWorkflows: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            eventType: {
                id: number;
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
                teamId?: number | null | undefined;
                parent?: {
                    id: number | null;
                    teamId: number | null;
                } | null | undefined;
                userId?: number | null | undefined;
            };
        };
        output: import("@calcom/ee/workflows/lib/types").Workflow[];
    }>;
}>;
