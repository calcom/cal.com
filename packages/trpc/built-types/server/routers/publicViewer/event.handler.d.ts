import type { PrismaClient } from "@calcom/prisma";
import type { TEventInputSchema } from "./event.schema";
interface EventHandlerOptions {
    ctx: {
        prisma: PrismaClient;
    };
    input: TEventInputSchema;
}
export declare const eventHandler: ({ ctx, input }: EventHandlerOptions) => Promise<{
    bookingFields: {
        type: "number" | "boolean" | "name" | "email" | "select" | "url" | "text" | "textarea" | "phone" | "address" | "multiemail" | "multiselect" | "checkbox" | "radio" | "radioInput";
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
                    type: "number" | "boolean" | "name" | "email" | "select" | "url" | "text" | "textarea" | "phone" | "address" | "multiemail" | "multiselect" | "checkbox" | "radio" | "radioInput";
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
        editable?: "user" | "system-but-optional" | "system" | "system-but-hidden" | "user-readonly" | undefined;
        sources?: {
            label: string;
            type: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }[] & import("zod").BRAND<"HAS_SYSTEM_FIELDS">;
    users: ({
        metadata: undefined;
        bookerUrl: string;
        profile: import("@calcom/types/UserProfile").UserAsPersonalProfile;
        theme: string | null;
        id: number;
        name: string | null;
        email: string;
        timeZone: string;
        username: string | null;
        locale: string | null;
        startTime: number;
        endTime: number;
        bio: string | null;
        hideBranding: boolean;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        createdDate: Date;
        trialEndsAt: Date | null;
        completedOnboarding: boolean;
        twoFactorSecret: string | null;
        twoFactorEnabled: boolean;
        backupCodes: string | null;
        identityProviderId: string | null;
        invitedTo: number | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        verified: boolean | null;
        disableImpersonation: boolean;
        locked: boolean;
        movedToProfileId: number | null;
        isPlatformManaged: boolean;
    } | {
        metadata: undefined;
        bookerUrl: string;
        profile: {
            organization: Omit<{
                metadata: import(".prisma/client").Prisma.JsonValue;
                id: number;
                name: string;
                slug: string | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                bannerUrl: string | null;
                isPlatform: boolean;
            } & Omit<Pick<{
                id: number;
                name: string;
                slug: string | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                appLogo: string | null;
                appIconLogo: string | null;
                bio: string | null;
                hideBranding: boolean;
                isPrivate: boolean;
                hideBookATeamMember: boolean;
                createdAt: Date;
                metadata: import(".prisma/client").Prisma.JsonValue;
                theme: string | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                bannerUrl: string | null;
                parentId: number | null;
                timeFormat: number | null;
                timeZone: string;
                weekStart: string;
                isOrganization: boolean;
                pendingPayment: boolean;
                isPlatform: boolean;
                createdByOAuthClientId: string | null;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
            }, "name" | "id" | "metadata" | "slug" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
                requestedSlug: string | null;
                metadata: {
                    requestedSlug: string | null;
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
                };
            }, "metadata"> & {
                requestedSlug: string | null;
                metadata: {
                    requestedSlug: string | null;
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
                };
            };
            id: number;
            organizationId: number;
            userId: number;
            uid: string;
            username: string;
            createdAt: Date & string;
            updatedAt: Date & string;
            upId: string;
        };
        theme: string | null;
        id: number;
        name: string | null;
        email: string;
        timeZone: string;
        username: string | null;
        locale: string | null;
        startTime: number;
        endTime: number;
        bio: string | null;
        hideBranding: boolean;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        createdDate: Date;
        trialEndsAt: Date | null;
        completedOnboarding: boolean;
        twoFactorSecret: string | null;
        twoFactorEnabled: boolean;
        backupCodes: string | null;
        identityProviderId: string | null;
        invitedTo: number | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        verified: boolean | null;
        disableImpersonation: boolean;
        locked: boolean;
        movedToProfileId: number | null;
        isPlatformManaged: boolean;
    })[];
    locations: (Pick<Partial<import("@calcom/app-store/locations").LocationObject>, "link" | "address"> & Omit<import("@calcom/app-store/locations").LocationObject, "link" | "address">)[];
    profile: {
        image?: string | undefined;
        name?: string | undefined;
        username?: string | null | undefined;
        weekStart: string;
        brandColor: string | null;
        darkBrandColor: string | null;
        theme: null;
        bookerLayouts: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null;
    };
    entity: {
        considerUnpublished: boolean;
        fromRedirectOfNonOrgLink: boolean;
        orgSlug: string | null;
        name: string | null;
        teamSlug: null;
        logoUrl: null;
    };
    isInstantEvent: boolean;
    showInstantEventConnectNowModal: boolean;
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
    hosts: never[];
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
} | {
    bookerLayouts: {
        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
    } | null;
    description: string;
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
    locations: (Pick<Partial<import("@calcom/app-store/locations").LocationObject>, "link" | "address"> & Omit<import("@calcom/app-store/locations").LocationObject, "link" | "address">)[];
    bookingFields: {
        type: "number" | "boolean" | "name" | "email" | "select" | "url" | "text" | "textarea" | "phone" | "address" | "multiemail" | "multiselect" | "checkbox" | "radio" | "radioInput";
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
                    type: "number" | "boolean" | "name" | "email" | "select" | "url" | "text" | "textarea" | "phone" | "address" | "multiemail" | "multiselect" | "checkbox" | "radio" | "radioInput";
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
        editable?: "user" | "system-but-optional" | "system" | "system-but-hidden" | "user-readonly" | undefined;
        sources?: {
            label: string;
            type: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }[] & import("zod").BRAND<"HAS_SYSTEM_FIELDS">;
    recurringEvent: import("@calcom/types/Calendar").RecurringEvent | null;
    profile: {
        username: string | null | undefined;
        name: string | null;
        weekStart: string;
        image: string;
        brandColor: string | null;
        darkBrandColor: string | null;
        theme: string | null;
        bookerLayouts: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null;
    };
    users: {
        username: string | null;
        name: string | null;
        weekStart: string;
        organizationId: any;
        avatarUrl: string | null;
        profile: import("@calcom/types/UserProfile").UserProfile;
        bookerUrl: string;
    }[];
    entity: {
        logoUrl?: string | undefined;
        name: any;
        fromRedirectOfNonOrgLink: boolean;
        considerUnpublished: boolean;
        orgSlug: string | null;
        teamSlug: string | null;
    };
    isDynamic: boolean;
    isInstantEvent: boolean;
    showInstantEventConnectNowModal: boolean;
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
    assignAllTeamMembers: boolean;
    owner: ({
        metadata: import(".prisma/client").Prisma.JsonValue;
        theme: string | null;
        id: number;
        name: string | null;
        username: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        weekStart: string;
        organization: {
            id: number;
            name: string;
            slug: string | null;
            calVideoLogo: string | null;
            bannerUrl: string | null;
        } | null;
        avatarUrl: string | null;
        defaultScheduleId: number | null;
    } & {
        nonProfileUsername: string | null;
        profile: import("@calcom/types/UserProfile").UserProfile;
    }) | null;
    hosts: {
        user: {
            metadata: import(".prisma/client").Prisma.JsonValue;
            theme: string | null;
            id: number;
            name: string | null;
            username: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            weekStart: string;
            organization: {
                id: number;
                name: string;
                slug: string | null;
                calVideoLogo: string | null;
                bannerUrl: string | null;
            } | null;
            avatarUrl: string | null;
            defaultScheduleId: number | null;
        } & {
            nonProfileUsername: string | null;
            profile: import("@calcom/types/UserProfile").UserProfile;
        };
    }[];
    title: string;
    hidden: boolean;
    length: number;
    id: number;
    slug: string;
    eventName: string | null;
    lockTimeZoneToggleOnBookingPage: boolean;
    requiresConfirmation: boolean;
    requiresBookerEmailVerification: boolean;
    disableGuests: boolean;
    seatsPerTimeSlot: number | null;
    seatsShowAvailabilityCount: boolean | null;
    schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
    price: number;
    currency: string;
    successRedirectUrl: string | null;
    forwardParamsSuccessRedirect: boolean | null;
    rescheduleWithSameRoundRobinHost: boolean;
    team: {
        metadata: import(".prisma/client").Prisma.JsonValue;
        theme: string | null;
        name: string;
        parent: {
            name: string;
            slug: string | null;
            logoUrl: string | null;
            bannerUrl: string | null;
        } | null;
        slug: string | null;
        parentId: number | null;
        logoUrl: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
    } | null;
    schedule: {
        id: number;
        timeZone: string | null;
    } | null;
    workflows: ({
        workflow: {
            steps: {
                template: import(".prisma/client").$Enums.WorkflowTemplates;
                id: number;
                action: import(".prisma/client").$Enums.WorkflowActions;
                stepNumber: number;
                workflowId: number;
                sendTo: string | null;
                reminderBody: string | null;
                emailSubject: string | null;
                numberRequired: boolean | null;
                sender: string | null;
                numberVerificationPending: boolean;
                includeCalendarEvent: boolean;
            }[];
        } & {
            position: number;
            time: number | null;
            id: number;
            name: string;
            userId: number | null;
            teamId: number | null;
            isActiveOnAll: boolean;
            trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
            timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
        };
    } & {
        id: number;
        eventTypeId: number;
        workflowId: number;
    })[];
    instantMeetingSchedule: {
        id: number;
        timeZone: string | null;
    } | null;
} | null>;
export default eventHandler;
