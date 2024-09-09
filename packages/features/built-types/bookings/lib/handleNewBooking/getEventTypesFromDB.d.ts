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
                position?: true | undefined;
                title?: true | undefined;
                metadata?: true | undefined;
                hidden?: true | undefined;
                length?: true | undefined;
                parent?: true | undefined;
                description?: true | undefined;
                children?: true | undefined;
                timeZone?: true | undefined;
                slug?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                userId?: true | undefined;
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
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
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
    recurringEvent: import("@calcom/types/Calendar").RecurringEvent | null;
    customInputs: {
        label: string;
        type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
        id: number;
        placeholder: string;
        required: boolean;
        eventTypeId: number;
        options?: {
            label: string;
            type: string;
        }[] | null | undefined;
        hasToBeCreated?: boolean | undefined;
    }[];
    locations: LocationObject[];
    bookingFields: {
        type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
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
            type: "text" | "address" | "phone";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }> | undefined;
        minLength?: number | undefined;
        variant?: string | undefined;
        variantsConfig?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
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
        editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
        sources?: {
            label: string;
            type: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }[] & import("zod").BRAND<"HAS_SYSTEM_FIELDS">;
    isDynamic: boolean;
    title: string;
    length: number;
    id: number;
    parent: {
        teamId: number | null;
    } | null;
    description: string | null;
    timeZone: string | null;
    slug: string;
    userId: number | null;
    teamId: number | null;
    eventName: string | null;
    parentId: number | null;
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
    hosts: {
        user: {
            metadata: import(".prisma/client").Prisma.JsonValue;
            theme: string | null;
            id: number;
            name: string | null;
            email: string;
            timeZone: string;
            availability: {
                date: Date | null;
                days: number[];
                id: number;
                userId: number | null;
                scheduleId: number | null;
                eventTypeId: number | null;
                startTime: Date;
                endTime: Date;
            }[];
            destinationCalendar: {
                id: number;
                userId: number | null;
                credentialId: number | null;
                eventTypeId: number | null;
                integration: string;
                externalId: string;
                primaryEmail: string | null;
            } | null;
            username: string | null;
            locale: string | null;
            startTime: number;
            endTime: number;
            hideBranding: boolean;
            brandColor: string | null;
            darkBrandColor: string | null;
            timeFormat: number | null;
            credentials: {
                invalid: boolean | null;
                type: string;
                id: number;
                key: import(".prisma/client").Prisma.JsonValue;
                user: {
                    email: string;
                } | null;
                userId: number | null;
                teamId: number | null;
                appId: string | null;
            }[];
            travelSchedules: {
                id: number;
                timeZone: string;
                userId: number;
                startDate: Date;
                endDate: Date | null;
                prevTimeZone: string | null;
            }[];
            schedules: {
                id: number;
                timeZone: string | null;
                availability: {
                    date: Date | null;
                    days: number[];
                    startTime: Date;
                    endTime: Date;
                }[];
            }[];
            selectedCalendars: {
                userId: number;
                credentialId: number | null;
                integration: string;
                externalId: string;
            }[];
            bufferTime: number;
            defaultScheduleId: number | null;
            allowDynamicBooking: boolean | null;
        };
        isFixed: boolean;
        priority: number | null;
        weight: number | null;
        weightAdjustment: number | null;
    }[];
    users: {
        metadata: import(".prisma/client").Prisma.JsonValue;
        theme: string | null;
        id: number;
        name: string | null;
        email: string;
        timeZone: string;
        availability: {
            date: Date | null;
            days: number[];
            id: number;
            userId: number | null;
            scheduleId: number | null;
            eventTypeId: number | null;
            startTime: Date;
            endTime: Date;
        }[];
        destinationCalendar: {
            id: number;
            userId: number | null;
            credentialId: number | null;
            eventTypeId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        username: string | null;
        locale: string | null;
        startTime: number;
        endTime: number;
        hideBranding: boolean;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        credentials: {
            invalid: boolean | null;
            type: string;
            id: number;
            key: import(".prisma/client").Prisma.JsonValue;
            user: {
                email: string;
            } | null;
            userId: number | null;
            teamId: number | null;
            appId: string | null;
        }[];
        travelSchedules: {
            id: number;
            timeZone: string;
            userId: number;
            startDate: Date;
            endDate: Date | null;
            prevTimeZone: string | null;
        }[];
        schedules: {
            id: number;
            timeZone: string | null;
            availability: {
                date: Date | null;
                days: number[];
                startTime: Date;
                endTime: Date;
            }[];
        }[];
        selectedCalendars: {
            userId: number;
            credentialId: number | null;
            integration: string;
            externalId: string;
        }[];
        bufferTime: number;
        defaultScheduleId: number | null;
        allowDynamicBooking: boolean | null;
    }[];
    owner: {
        hideBranding: boolean;
    } | null;
    team: {
        id: number;
        name: string;
        parentId: number | null;
    } | null;
    availability: {
        date: Date | null;
        days: number[];
        startTime: Date;
        endTime: Date;
    }[];
    destinationCalendar: {
        id: number;
        userId: number | null;
        credentialId: number | null;
        eventTypeId: number | null;
        integration: string;
        externalId: string;
        primaryEmail: string | null;
    } | null;
    schedule: {
        id: number;
        timeZone: string | null;
        availability: {
            date: Date | null;
            days: number[];
            id: number;
            userId: number | null;
            scheduleId: number | null;
            eventTypeId: number | null;
            startTime: Date;
            endTime: Date;
        }[];
    } | null;
    workflows: {
        workflow: {
            time: number | null;
            id: number;
            name: string;
            userId: number | null;
            teamId: number | null;
            steps: {
                template: import(".prisma/client").$Enums.WorkflowTemplates;
                id: number;
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
    secondaryEmail: {
        id: number;
        email: string;
    } | null;
}>;
export type getEventTypeResponse = Awaited<ReturnType<typeof getEventTypesFromDB>>;
//# sourceMappingURL=getEventTypesFromDB.d.ts.map