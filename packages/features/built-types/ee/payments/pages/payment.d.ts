import type { GetServerSidePropsContext } from "next";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
export type PaymentPageProps = inferSSRProps<typeof getServerSideProps>;
export declare const getServerSideProps: (context: GetServerSidePropsContext) => Promise<{
    readonly notFound: true;
    redirect?: undefined;
    props?: undefined;
} | {
    redirect: {
        destination: string;
        permanent: boolean;
    };
    readonly notFound?: undefined;
    props?: undefined;
} | {
    props: {
        user: {
            name: string | null;
            username: string | null;
            hideBranding: boolean;
            theme: string | null;
        } | {
            name: null;
            theme: null;
            hideBranding: null;
            username: null;
        };
        eventType: {
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
            length: number;
            id: number;
            description: string | null;
            team: {
                name: string;
                hideBranding: boolean;
            } | null;
            userId: number | null;
            title: string;
            users: {
                name: string | null;
                username: string | null;
                hideBranding: boolean;
                theme: string | null;
            }[];
            eventName: string | null;
            requiresConfirmation: boolean;
            price: number;
            currency: string;
            successRedirectUrl: string | null;
            forwardParamsSuccessRedirect: boolean | null;
        };
        booking: {
            startTime: string;
            endTime: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            id: number;
            description: string | null;
            attendees: {
                name: string;
                email: string;
            }[];
            uid: string;
            eventTypeId: number | null;
            title: string;
            location: string | null;
            cancellationReason: string | null;
            rejectionReason: string | null;
        };
        trpcState: import("@tanstack/query-core/build/legacy/hydration").DehydratedState;
        payment: {
            data: Record<string, unknown>;
            uid: string;
            success: boolean;
            currency: string;
            bookingId: number;
            appId: string | null;
            amount: number;
            refunded: boolean;
            paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
        };
        clientSecret: string;
        profile: {
            name: string | null;
            theme: string | null;
            hideBranding: true | null;
        };
    };
    readonly notFound?: undefined;
    redirect?: undefined;
}>;
//# sourceMappingURL=payment.d.ts.map