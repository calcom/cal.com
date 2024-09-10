import type { CurrentSeats, IFromUser, IToUser } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import { Prisma } from "@calcom/prisma/client";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { GetScheduleOptions } from "./getSchedule.handler";
import type { TGetScheduleInputSchema } from "./getSchedule.schema";
export declare const checkIfIsAvailable: ({ time, busy, eventLength, currentSeats, }: {
    time: Dayjs;
    busy: EventBusyDate[];
    eventLength: number;
    currentSeats?: {
        uid: string;
        startTime: Date;
        _count: {
            attendees: number;
        };
    }[] | undefined;
}) => boolean;
export declare function getEventType(input: TGetScheduleInputSchema, organizationDetails: {
    currentOrgDomain: string | null;
    isValidOrgDomain: boolean;
}): Promise<{
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
    length: number;
    id: number;
    slug: string;
    offsetStart: number;
    timeZone: string | null;
    periodType: import(".prisma/client").$Enums.PeriodType;
    periodStartDate: Date | null;
    periodEndDate: Date | null;
    periodDays: number | null;
    periodCountCalendarDays: boolean | null;
    minimumBookingNotice: number;
    beforeEventBuffer: number;
    afterEventBuffer: number;
    seatsPerTimeSlot: number | null;
    onlyShowFirstAvailableSlot: boolean;
    schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
    slotInterval: number | null;
    bookingLimits: Prisma.JsonValue;
    durationLimits: Prisma.JsonValue;
    assignAllTeamMembers: boolean;
    rescheduleWithSameRoundRobinHost: boolean;
    hosts: {
        user: {
            id: number;
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
            email: string;
            username: string | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            defaultScheduleId: number | null;
            timeFormat: number | null;
            travelSchedules: {
                id: number;
                userId: number;
                timeZone: string;
                endDate: Date | null;
                startDate: Date;
                prevTimeZone: string | null;
            }[];
            credentials: {
                type: string;
                id: number;
                userId: number | null;
                teamId: number | null;
                user: {
                    email: string;
                } | null;
                appId: string | null;
                key: Prisma.JsonValue;
                invalid: boolean | null;
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
                externalId: string;
                integration: string;
            }[];
        };
        isFixed: boolean;
    }[];
    users: {
        id: number;
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
        email: string;
        username: string | null;
        startTime: number;
        endTime: number;
        bufferTime: number;
        defaultScheduleId: number | null;
        timeFormat: number | null;
        travelSchedules: {
            id: number;
            userId: number;
            timeZone: string;
            endDate: Date | null;
            startDate: Date;
            prevTimeZone: string | null;
        }[];
        credentials: {
            type: string;
            id: number;
            userId: number | null;
            teamId: number | null;
            user: {
                email: string;
            } | null;
            appId: string | null;
            key: Prisma.JsonValue;
            invalid: boolean | null;
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
            externalId: string;
            integration: string;
        }[];
    }[];
    availability: {
        date: Date | null;
        days: number[];
        startTime: Date;
        endTime: Date;
    }[];
    schedule: {
        id: number;
        timeZone: string | null;
        availability: {
            date: Date | null;
            days: number[];
            startTime: Date;
            endTime: Date;
        }[];
    } | null;
} | null>;
export declare function getDynamicEventType(input: TGetScheduleInputSchema, organizationDetails: {
    currentOrgDomain: string | null;
    isValidOrgDomain: boolean;
}): Promise<{
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
    isDynamic: boolean;
    periodCountCalendarDays: boolean;
    periodStartDate: null;
    periodEndDate: null;
    beforeEventBuffer: number;
    afterEventBuffer: number;
    periodType: "UNLIMITED";
    periodDays: null;
    slotInterval: null;
    offsetStart: number;
    locations: {
        type: string;
    }[];
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
    disableGuests: boolean;
    minimumBookingNotice: number;
    schedule: null;
    timeZone: null;
    successRedirectUrl: string;
    forwardParamsSuccessRedirect: boolean;
    teamId: null;
    scheduleId: null;
    availability: never[];
    price: number;
    currency: string;
    schedulingType: "COLLECTIVE";
    seatsPerTimeSlot: null;
    seatsShowAttendees: null;
    seatsShowAvailabilityCount: null;
    onlyShowFirstAvailableSlot: boolean;
    id: number;
    hideCalendarNotes: boolean;
    recurringEvent: null;
    destinationCalendar: null;
    team: null;
    lockTimeZoneToggleOnBookingPage: boolean;
    requiresConfirmation: boolean;
    requiresBookerEmailVerification: boolean;
    bookingLimits: null;
    durationLimits: null;
    hidden: boolean;
    userId: number;
    parentId: null;
    parent: null;
    owner: null;
    workflows: never[];
    users: ({
        id: number;
        timeZone: string;
        metadata: Prisma.JsonValue;
        availability: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            days: number[];
            startTime: Date;
            endTime: Date;
            date: Date | null;
            scheduleId: number | null;
        }[];
        destinationCalendar: {
            id: number;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
            userId: number | null;
            eventTypeId: number | null;
            credentialId: number | null;
        } | null;
        name: string | null;
        email: string;
        username: string | null;
        locale: string | null;
        allowDynamicBooking: boolean | null;
        startTime: number;
        endTime: number;
        bufferTime: number;
        hideBranding: boolean;
        theme: string | null;
        defaultScheduleId: number | null;
        timeFormat: number | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        travelSchedules: {
            id: number;
            userId: number;
            timeZone: string;
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
            integration: string;
            externalId: string;
            credentialId: number | null;
        }[];
    } & {
        credentials: {
            type: string;
            id: number;
            userId: number | null;
            teamId: number | null;
            user: {
                email: string;
            } | null;
            appId: string | null;
            key: Prisma.JsonValue;
            invalid: boolean | null;
        }[];
    })[];
    hosts: never[];
    bookingFields: never[];
    assignAllTeamMembers: boolean;
    isRRWeightsEnabled: boolean;
    rescheduleWithSameRoundRobinHost: boolean;
    useEventTypeDestinationCalendarEmail: boolean;
    secondaryEmailId: null;
    secondaryEmail: null;
    length: number;
    slug: string;
    title: string;
    eventName: string;
    description: string;
    descriptionAsSafeHTML: string;
    position: number;
} & {
    users: {
        id: number;
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
        email: string;
        username: string | null;
        allowDynamicBooking: boolean | null;
        startTime: number;
        endTime: number;
        bufferTime: number;
        defaultScheduleId: number | null;
        timeFormat: number | null;
        travelSchedules: {
            id: number;
            userId: number;
            timeZone: string;
            endDate: Date | null;
            startDate: Date;
            prevTimeZone: string | null;
        }[];
        credentials: {
            type: string;
            id: number;
            userId: number | null;
            teamId: number | null;
            user: {
                email: string;
            } | null;
            appId: string | null;
            key: Prisma.JsonValue;
            invalid: boolean | null;
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
            externalId: string;
            integration: string;
        }[];
    }[];
}>;
export declare function getRegularOrDynamicEventType(input: TGetScheduleInputSchema, organizationDetails: {
    currentOrgDomain: string | null;
    isValidOrgDomain: boolean;
}): Promise<{
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
    length: number;
    id: number;
    slug: string;
    offsetStart: number;
    timeZone: string | null;
    periodType: import(".prisma/client").$Enums.PeriodType;
    periodStartDate: Date | null;
    periodEndDate: Date | null;
    periodDays: number | null;
    periodCountCalendarDays: boolean | null;
    minimumBookingNotice: number;
    beforeEventBuffer: number;
    afterEventBuffer: number;
    seatsPerTimeSlot: number | null;
    onlyShowFirstAvailableSlot: boolean;
    schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
    slotInterval: number | null;
    bookingLimits: Prisma.JsonValue;
    durationLimits: Prisma.JsonValue;
    assignAllTeamMembers: boolean;
    rescheduleWithSameRoundRobinHost: boolean;
    hosts: {
        user: {
            id: number;
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
            email: string;
            username: string | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            defaultScheduleId: number | null;
            timeFormat: number | null;
            travelSchedules: {
                id: number;
                userId: number;
                timeZone: string;
                endDate: Date | null;
                startDate: Date;
                prevTimeZone: string | null;
            }[];
            credentials: {
                type: string;
                id: number;
                userId: number | null;
                teamId: number | null;
                user: {
                    email: string;
                } | null;
                appId: string | null;
                key: Prisma.JsonValue;
                invalid: boolean | null;
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
                externalId: string;
                integration: string;
            }[];
        };
        isFixed: boolean;
    }[];
    users: {
        id: number;
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
        email: string;
        username: string | null;
        startTime: number;
        endTime: number;
        bufferTime: number;
        defaultScheduleId: number | null;
        timeFormat: number | null;
        travelSchedules: {
            id: number;
            userId: number;
            timeZone: string;
            endDate: Date | null;
            startDate: Date;
            prevTimeZone: string | null;
        }[];
        credentials: {
            type: string;
            id: number;
            userId: number | null;
            teamId: number | null;
            user: {
                email: string;
            } | null;
            appId: string | null;
            key: Prisma.JsonValue;
            invalid: boolean | null;
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
            externalId: string;
            integration: string;
        }[];
    }[];
    availability: {
        date: Date | null;
        days: number[];
        startTime: Date;
        endTime: Date;
    }[];
    schedule: {
        id: number;
        timeZone: string | null;
        availability: {
            date: Date | null;
            days: number[];
            startTime: Date;
            endTime: Date;
        }[];
    } | null;
} | null>;
export interface IGetAvailableSlots {
    slots: Record<string, {
        time: string;
        attendees?: number | undefined;
        bookingUid?: string | undefined;
        away?: boolean | undefined;
        fromUser?: IFromUser | undefined;
        toUser?: IToUser | undefined;
        reason?: string | undefined;
        emoji?: string | undefined;
    }[]>;
}
export declare function getAvailableSlots({ input, ctx }: GetScheduleOptions): Promise<IGetAvailableSlots>;
export declare function getAllDatesWithBookabilityStatus(availableDates: string[]): Record<string, {
    isBookable: boolean;
}>;
