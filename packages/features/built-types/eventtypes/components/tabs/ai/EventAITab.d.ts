/// <reference types="react" />
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
export declare const EventAITab: ({ eventType, isTeamEvent, }: Pick<{
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
                    description?: true | undefined;
                    hidden?: true | undefined;
                    children?: true | undefined;
                    timeZone?: true | undefined;
                    metadata?: true | undefined;
                    destinationCalendar?: true | undefined;
                    profile?: true | undefined;
                    team?: true | undefined;
                    schedule?: true | undefined;
                    availability?: true | undefined;
                    hashedLink?: true | undefined;
                    secondaryEmail?: true | undefined;
                    userId?: true | undefined;
                    title?: true | undefined;
                    customInputs?: true | undefined;
                    bookings?: true | undefined;
                    webhooks?: true | undefined;
                    workflows?: true | undefined;
                    hosts?: true | undefined;
                    slug?: true | undefined;
                    parentId?: true | undefined;
                    parent?: true | undefined;
                    _count?: true | undefined;
                    teamId?: true | undefined;
                    profileId?: true | undefined;
                    scheduleId?: true | undefined;
                    users?: true | undefined;
                    position?: true | undefined;
                    locations?: true | undefined;
                    offsetStart?: true | undefined;
                    eventName?: true | undefined;
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
                    owner?: true | undefined;
                    instantMeetingSchedule?: true | undefined;
                    aiPhoneCallConfig?: true | undefined;
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
        };
        customInputs: {
            type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
            label: string;
            placeholder: string;
            required: boolean;
            id: number;
            eventTypeId: number;
            options?: {
                type: string;
                label: string;
            }[] | null | undefined;
            hasToBeCreated?: boolean | undefined;
        }[];
        users: {
            name: string | null;
            email: string;
            id: number;
            locale: string | null;
            username: string | null;
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
            hidden: boolean;
            slug: string;
        }[];
        length: number;
        id: number;
        description: string | null;
        hidden: boolean;
        timeZone: string | null;
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            externalId: string;
            integration: string;
            credentialId: number | null;
            primaryEmail: string | null;
        } | null;
        team: {
            name: string;
            id: number;
            slug: string | null;
            parentId: number | null;
            members: {
                user: {
                    name: string | null;
                    email: string;
                    id: number;
                    locale: string | null;
                    username: string | null;
                    avatarUrl: string | null;
                    defaultScheduleId: number | null;
                    eventTypes: {
                        slug: string;
                    }[];
                };
                role: import(".prisma/client").$Enums.MembershipRole;
                accepted: boolean;
            }[];
            parent: {
                organizationSettings: {
                    lockEventTypeCreationForUsers: boolean;
                } | null;
                slug: string | null;
            } | null;
        } | null;
        hashedLink: {
            id: number;
            link: string;
            eventTypeId: number;
        } | null;
        userId: number | null;
        title: string;
        webhooks: {
            id: string;
            eventTypeId: number | null;
            subscriberUrl: string;
            payloadTemplate: string | null;
            active: boolean;
            eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
            secret: string | null;
        }[];
        workflows: ({
            workflow: {
                name: string;
                id: number;
                team: {
                    name: string;
                    id: number;
                    slug: string | null;
                    members: {
                        id: number;
                        role: import(".prisma/client").$Enums.MembershipRole;
                        disableImpersonation: boolean;
                        userId: number;
                        teamId: number;
                        accepted: boolean;
                    }[];
                } | null;
                userId: number | null;
                teamId: number | null;
                time: number | null;
                steps: {
                    id: number;
                    template: import(".prisma/client").$Enums.WorkflowTemplates;
                    workflowId: number;
                    stepNumber: number;
                    action: import(".prisma/client").$Enums.WorkflowActions;
                    sendTo: string | null;
                    reminderBody: string | null;
                    emailSubject: string | null;
                    numberRequired: boolean | null;
                    sender: string | null;
                    numberVerificationPending: boolean;
                    includeCalendarEvent: boolean;
                }[];
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
            };
        } & {
            id: number;
            eventTypeId: number;
            workflowId: number;
        })[];
        hosts: {
            userId: number;
            isFixed: boolean;
            priority: number | null;
            weight: number | null;
            weightAdjustment: number | null;
        }[];
        slug: string;
        parent: {
            id: number;
            teamId: number | null;
        } | null;
        teamId: number | null;
        offsetStart: number;
        eventName: string | null;
        bookingFields: import(".prisma/client").Prisma.JsonValue;
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
        owner: {
            id: number;
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
    } & {
        users: ({
            name: string | null;
            email: string;
            id: number;
            locale: string | null;
            username: string | null;
            avatarUrl: string | null;
            defaultScheduleId: number | null;
        } & {
            avatar: string;
        })[];
        periodStartDate: string | null;
        periodEndDate: string | null;
        bookingFields: {
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
            editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
            sources?: {
                type: string;
                label: string;
                id: string;
                editUrl?: string | undefined;
                fieldRequired?: boolean | undefined;
            }[] | undefined;
            disableOnPrefill?: boolean | undefined;
        }[] & import("zod").BRAND<"HAS_SYSTEM_FIELDS">;
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
        eventTypeId: number | null;
        externalId: string;
        integration: string;
        credentialId: number | null;
        primaryEmail: string | null;
    } | null;
    team: {
        name: string;
        id: number;
        slug: string | null;
        parentId: number | null;
        members: {
            user: {
                name: string | null;
                email: string;
                id: number;
                locale: string | null;
                username: string | null;
                avatarUrl: string | null;
                defaultScheduleId: number | null;
                eventTypes: {
                    slug: string;
                }[];
            };
            role: import(".prisma/client").$Enums.MembershipRole;
            accepted: boolean;
        }[];
        parent: {
            organizationSettings: {
                lockEventTypeCreationForUsers: boolean;
            } | null;
            slug: string | null;
        } | null;
    } | null;
    teamMembers: {
        profileId: number | null;
        eventTypes: string[];
        membership: import(".prisma/client").$Enums.MembershipRole;
        name: string | null;
        email: string;
        id: number;
        locale: string | null;
        username: string | null;
        avatarUrl: string | null;
        defaultScheduleId: number | null;
        nonProfileUsername: string | null;
        profile: import("@calcom/types/UserProfile").UserProfile;
        avatar: string;
    }[];
    currentUserMembership: {
        user: {
            name: string | null;
            email: string;
            id: number;
            locale: string | null;
            username: string | null;
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
}, "eventType"> & {
    isTeamEvent: boolean;
}) => JSX.Element;
//# sourceMappingURL=EventAITab.d.ts.map