import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetInputSchema;
};
export declare const getHandler: ({ ctx, input }: GetOptions) => Promise<{
    bookings: {
        eventType: {
            recurringEvent: import("@calcom/types/Calendar").RecurringEvent | null;
            eventTypeColor: {
                lightEventTypeColor: string;
                darkEventTypeColor: string;
            } | null;
            price: number;
            currency: string;
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
            id?: number | undefined;
            slug?: string | undefined;
            eventName?: string | null | undefined;
            seatsShowAttendees?: boolean | null | undefined;
            seatsShowAvailabilityCount?: boolean | null | undefined;
            schedulingType?: import(".prisma/client").$Enums.SchedulingType | null | undefined;
            team?: {
                id: number;
                name: string;
                members: {
                    id: number;
                    userId: number;
                    teamId: number;
                    role: import(".prisma/client").$Enums.MembershipRole;
                    disableImpersonation: boolean;
                    accepted: boolean;
                }[];
            } | null | undefined;
        };
        startTime: string;
        endTime: string;
        isUserTeamAdminOrOwner: boolean;
        status: import(".prisma/client").$Enums.BookingStatus;
        id: number;
        title: string;
        description: string | null;
        metadata: Prisma.JsonValue;
        customInputs: Prisma.JsonValue;
        location: string | null;
        recurringEventId: string | null;
        user: {
            id: number;
            name: string | null;
            email: string;
        } | null;
        uid: string;
        payment: {
            currency: string;
            success: boolean;
            amount: number;
            paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
        }[];
        references: {
            type: string;
            id: number;
            credentialId: number | null;
            bookingId: number | null;
            uid: string;
            thirdPartyRecurringEventId: string | null;
            meetingId: string | null;
            meetingPassword: string | null;
            meetingUrl: string | null;
            externalCalendarId: string | null;
            deleted: boolean | null;
        }[];
        attendees: {
            id: number;
            timeZone: string;
            name: string;
            email: string;
            bookingId: number | null;
            locale: string | null;
            noShow: boolean | null;
        }[];
        seatsReferences: {
            attendee: {
                email: string;
            };
            referenceUid: string;
        }[];
        userPrimaryEmail: string | null;
        paid: boolean;
        rescheduled: boolean | null;
        isRecorded: boolean;
    }[];
    recurringInfo: {
        recurringEventId: string | null;
        count: number;
        firstDate: Date | null;
        bookings: {
            [key: string]: Date[];
        };
    }[];
    nextCursor: number | null;
}>;
export declare function getBookings({ user, prisma, passedBookingsStatusFilter, filters, orderBy, take, skip, }: {
    user: {
        id: number;
        email: string;
    };
    filters: TGetInputSchema["filters"];
    prisma: PrismaClient;
    passedBookingsStatusFilter: Prisma.BookingWhereInput;
    orderBy: Prisma.BookingOrderByWithAggregationInput;
    take: number;
    skip: number;
}): Promise<{
    bookings: {
        eventType: {
            recurringEvent: import("@calcom/types/Calendar").RecurringEvent | null;
            eventTypeColor: {
                lightEventTypeColor: string;
                darkEventTypeColor: string;
            } | null;
            price: number;
            currency: string;
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
            id?: number | undefined;
            slug?: string | undefined;
            eventName?: string | null | undefined;
            seatsShowAttendees?: boolean | null | undefined;
            seatsShowAvailabilityCount?: boolean | null | undefined;
            schedulingType?: import(".prisma/client").$Enums.SchedulingType | null | undefined;
            team?: {
                id: number;
                name: string;
                members: {
                    id: number;
                    userId: number;
                    teamId: number;
                    role: import(".prisma/client").$Enums.MembershipRole;
                    disableImpersonation: boolean;
                    accepted: boolean;
                }[];
            } | null | undefined;
        };
        startTime: string;
        endTime: string;
        isUserTeamAdminOrOwner: boolean;
        status: import(".prisma/client").$Enums.BookingStatus;
        id: number;
        title: string;
        description: string | null;
        metadata: Prisma.JsonValue;
        customInputs: Prisma.JsonValue;
        location: string | null;
        recurringEventId: string | null;
        user: {
            id: number;
            name: string | null;
            email: string;
        } | null;
        uid: string;
        payment: {
            currency: string;
            success: boolean;
            amount: number;
            paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
        }[];
        references: {
            type: string;
            id: number;
            credentialId: number | null;
            bookingId: number | null;
            uid: string;
            thirdPartyRecurringEventId: string | null;
            meetingId: string | null;
            meetingPassword: string | null;
            meetingUrl: string | null;
            externalCalendarId: string | null;
            deleted: boolean | null;
        }[];
        attendees: {
            id: number;
            timeZone: string;
            name: string;
            email: string;
            bookingId: number | null;
            locale: string | null;
            noShow: boolean | null;
        }[];
        seatsReferences: {
            attendee: {
                email: string;
            };
            referenceUid: string;
        }[];
        userPrimaryEmail: string | null;
        paid: boolean;
        rescheduled: boolean | null;
        isRecorded: boolean;
    }[];
    recurringInfo: {
        recurringEventId: string | null;
        count: number;
        firstDate: Date | null;
        bookings: {
            [key: string]: Date[];
        };
    }[];
}>;
export {};
