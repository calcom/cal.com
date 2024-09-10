import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../trpc";
import type { TGetEventTypesFromGroupSchema } from "./getByViewer.schema";
type GetByViewerOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetEventTypesFromGroupSchema;
};
export declare const getEventTypesFromGroup: ({ ctx, input }: GetByViewerOptions) => Promise<{
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
}>;
export {};
