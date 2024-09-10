import type { LocationObject } from "@calcom/app-store/locations";
export declare const getEventTypesFromDB: (eventTypeId: number) => Promise<{
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
    } | null;
    recurringEvent: import("@calcom/types/Calendar").RecurringEvent | null;
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
    locations: LocationObject[];
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
    isDynamic: boolean;
    length: number;
    id: number;
    description: string | null;
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
        parentId: number | null;
    } | null;
    schedule: {
        id: number;
        timeZone: string | null;
        availability: {
            date: Date | null;
            id: number;
            startTime: Date;
            endTime: Date;
            userId: number | null;
            eventTypeId: number | null;
            days: number[];
            scheduleId: number | null;
        }[];
    } | null;
    availability: {
        date: Date | null;
        startTime: Date;
        endTime: Date;
        days: number[];
    }[];
    secondaryEmail: {
        email: string;
        id: number;
    } | null;
    userId: number | null;
    title: string;
    workflows: {
        workflow: {
            name: string;
            id: number;
            userId: number | null;
            teamId: number | null;
            time: number | null;
            steps: {
                id: number;
                template: import(".prisma/client").$Enums.WorkflowTemplates;
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
        };
    }[];
    hosts: {
        user: {
            name: string | null;
            email: string;
            id: number;
            locale: string | null;
            allowDynamicBooking: boolean | null;
            username: string | null;
            timeZone: string;
            startTime: number;
            endTime: number;
            bufferTime: number;
            hideBranding: boolean;
            theme: string | null;
            defaultScheduleId: number | null;
            timeFormat: number | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            metadata: import(".prisma/client").Prisma.JsonValue;
            destinationCalendar: {
                id: number;
                userId: number | null;
                eventTypeId: number | null;
                externalId: string;
                integration: string;
                credentialId: number | null;
                primaryEmail: string | null;
            } | null;
            availability: {
                date: Date | null;
                id: number;
                startTime: Date;
                endTime: Date;
                userId: number | null;
                eventTypeId: number | null;
                days: number[];
                scheduleId: number | null;
            }[];
            travelSchedules: {
                id: number;
                timeZone: string;
                userId: number;
                endDate: Date | null;
                startDate: Date;
                prevTimeZone: string | null;
            }[];
            credentials: {
                type: string;
                id: number;
                user: {
                    email: string;
                } | null;
                userId: number | null;
                teamId: number | null;
                key: import(".prisma/client").Prisma.JsonValue;
                appId: string | null;
                invalid: boolean | null;
            }[];
            schedules: {
                id: number;
                timeZone: string | null;
                availability: {
                    date: Date | null;
                    startTime: Date;
                    endTime: Date;
                    days: number[];
                }[];
            }[];
            selectedCalendars: {
                userId: number;
                externalId: string;
                integration: string;
                credentialId: number | null;
            }[];
        };
        isFixed: boolean;
        priority: number | null;
        weight: number | null;
        weightAdjustment: number | null;
    }[];
    slug: string;
    parentId: number | null;
    parent: {
        teamId: number | null;
    } | null;
    teamId: number | null;
    users: {
        name: string | null;
        email: string;
        id: number;
        locale: string | null;
        allowDynamicBooking: boolean | null;
        username: string | null;
        timeZone: string;
        startTime: number;
        endTime: number;
        bufferTime: number;
        hideBranding: boolean;
        theme: string | null;
        defaultScheduleId: number | null;
        timeFormat: number | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        metadata: import(".prisma/client").Prisma.JsonValue;
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            externalId: string;
            integration: string;
            credentialId: number | null;
            primaryEmail: string | null;
        } | null;
        availability: {
            date: Date | null;
            id: number;
            startTime: Date;
            endTime: Date;
            userId: number | null;
            eventTypeId: number | null;
            days: number[];
            scheduleId: number | null;
        }[];
        travelSchedules: {
            id: number;
            timeZone: string;
            userId: number;
            endDate: Date | null;
            startDate: Date;
            prevTimeZone: string | null;
        }[];
        credentials: {
            type: string;
            id: number;
            user: {
                email: string;
            } | null;
            userId: number | null;
            teamId: number | null;
            key: import(".prisma/client").Prisma.JsonValue;
            appId: string | null;
            invalid: boolean | null;
        }[];
        schedules: {
            id: number;
            timeZone: string | null;
            availability: {
                date: Date | null;
                startTime: Date;
                endTime: Date;
                days: number[];
            }[];
        }[];
        selectedCalendars: {
            userId: number;
            externalId: string;
            integration: string;
            credentialId: number | null;
        }[];
    }[];
    eventName: string | null;
    periodType: import(".prisma/client").$Enums.PeriodType;
    periodStartDate: Date | null;
    periodEndDate: Date | null;
    periodDays: number | null;
    periodCountCalendarDays: boolean | null;
    lockTimeZoneToggleOnBookingPage: boolean;
    requiresConfirmation: boolean;
    requiresBookerEmailVerification: boolean;
    disableGuests: boolean;
    hideCalendarNotes: boolean;
    minimumBookingNotice: number;
    seatsPerTimeSlot: number | null;
    seatsShowAttendees: boolean | null;
    seatsShowAvailabilityCount: boolean | null;
    schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
    price: number;
    currency: string;
    bookingLimits: import(".prisma/client").Prisma.JsonValue;
    durationLimits: import(".prisma/client").Prisma.JsonValue;
    assignAllTeamMembers: boolean;
    useEventTypeDestinationCalendarEmail: boolean;
    isRRWeightsEnabled: boolean;
    rescheduleWithSameRoundRobinHost: boolean;
    secondaryEmailId: number | null;
    owner: {
        hideBranding: boolean;
    } | null;
}>;
export type getEventTypeResponse = Awaited<ReturnType<typeof getEventTypesFromDB>>;
//# sourceMappingURL=getEventTypesFromDB.d.ts.map