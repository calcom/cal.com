import { z } from "zod";
import type { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import type { PrismaClient } from "@calcom/prisma";
import { PeriodType } from "@calcom/prisma/enums";
import type { CustomInputSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeUpdateInput } from "./types";
type EventType = Awaited<ReturnType<typeof EventTypeRepository.findAllByUpId>>[number];
export declare const eventOwnerProcedure: import("@trpc/server/unstable-core-do-not-import").ProcedureBuilder<import("../../../createContext").InnerContext, object, {
    user: {
        avatar: string;
        organization: {
            id: number | null;
            isOrgAdmin: boolean;
            metadata: {
                requestedSlug?: string | null | undefined;
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
            } | null;
            requestedSlug: string | null;
            slug?: string | null | undefined;
            name?: string | undefined;
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            logoUrl?: string | null | undefined;
            calVideoLogo?: string | null | undefined;
            isPrivate?: boolean | undefined;
            bannerUrl?: string | null | undefined;
            isPlatform?: boolean | undefined;
            members?: {
                id: number;
                userId: number;
                teamId: number;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
                accepted: boolean;
            }[] | undefined;
        };
        organizationId: number | null;
        id: number;
        email: string;
        username: string | null;
        locale: string;
        defaultBookerLayouts: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null;
        timeZone: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
        destinationCalendar: {
            id: number;
            userId: number | null;
            credentialId: number | null;
            eventTypeId: number | null;
            externalId: string;
            integration: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        emailVerified: Date | null;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        bio: string | null;
        avatarUrl: string | null;
        weekStart: string;
        startTime: number;
        endTime: number;
        bufferTime: number;
        hideBranding: boolean;
        theme: string | null;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        timeFormat: number | null;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        brandColor: string | null;
        darkBrandColor: string | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
        selectedCalendars: {
            externalId: string;
            integration: string;
        }[];
        profile: import("@calcom/types/UserProfile").UserAsPersonalProfile;
    } | {
        avatar: string;
        organization: {
            id: number | null;
            isOrgAdmin: boolean;
            metadata: {
                requestedSlug?: string | null | undefined;
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
            } | null;
            requestedSlug: string | null;
            slug?: string | null | undefined;
            name?: string | undefined;
            organizationSettings?: {
                lockEventTypeCreationForUsers: boolean;
            } | null | undefined;
            logoUrl?: string | null | undefined;
            calVideoLogo?: string | null | undefined;
            isPrivate?: boolean | undefined;
            bannerUrl?: string | null | undefined;
            isPlatform?: boolean | undefined;
            members?: {
                id: number;
                userId: number;
                teamId: number;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
                accepted: boolean;
            }[] | undefined;
        };
        organizationId: number | null;
        id: number;
        email: string;
        username: string | null;
        locale: string;
        defaultBookerLayouts: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null;
        timeZone: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
        destinationCalendar: {
            id: number;
            userId: number | null;
            credentialId: number | null;
            eventTypeId: number | null;
            externalId: string;
            integration: string;
            primaryEmail: string | null;
        } | null;
        name: string | null;
        emailVerified: Date | null;
        identityProviderId: string | null;
        allowDynamicBooking: boolean | null;
        bio: string | null;
        avatarUrl: string | null;
        weekStart: string;
        startTime: number;
        endTime: number;
        bufferTime: number;
        hideBranding: boolean;
        theme: string | null;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        timeFormat: number | null;
        twoFactorEnabled: boolean;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        brandColor: string | null;
        darkBrandColor: string | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        movedToProfileId: number | null;
        selectedCalendars: {
            externalId: string;
            integration: string;
        }[];
        profile: {
            name: string | null;
            avatarUrl: string | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            username: string | null;
            upId: string;
            id: null;
            organizationId: null;
            organization: null;
        } | {
            name: string | null;
            avatarUrl: string | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            user: {
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                locale: string | null;
                avatarUrl: string | null;
                startTime: number;
                endTime: number;
                bufferTime: number;
                defaultScheduleId: number | null;
                isPlatformManaged: boolean;
            };
            organization: {
                id: number;
                slug: string | null;
                metadata: import(".prisma/client").Prisma.JsonValue;
                name: string;
                organizationSettings: {
                    lockEventTypeCreationForUsers: boolean;
                } | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                isPrivate: boolean;
                bannerUrl: string | null;
                isPlatform: boolean;
                members: {
                    id: number;
                    userId: number;
                    teamId: number;
                    role: import(".prisma/client").$Enums.MembershipRole;
                    disableImpersonation: boolean;
                    accepted: boolean;
                }[];
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
            }, "id" | "slug" | "metadata" | "name" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
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
            movedFromUser: {
                id: number;
            } | null;
            id: number;
            userId: number;
            uid: string;
            username: string;
            organizationId: number;
            createdAt: Date & string;
            updatedAt: Date & string;
            upId: string;
        };
    };
    session: {
        upId: string;
        hasValidLicense: boolean;
        profileId?: number | null | undefined;
        user: import("next-auth").User;
        expires: string;
    };
}, {
    id: number;
    users?: number[] | undefined;
}, {
    id: number;
    users: number[];
}, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker>;
export declare function isPeriodType(keyInput: string): keyInput is PeriodType;
export declare function handlePeriodType(periodType: string | undefined): PeriodType | undefined;
export declare function handleCustomInputs(customInputs: CustomInputSchema[], eventTypeId: number): {
    deleteMany: {
        eventTypeId: number;
        NOT: {
            id: {
                in: number[];
            };
        };
    };
    createMany: {
        data: {
            type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
            label: string;
            required: boolean;
            placeholder: string;
            options: {
                type: string;
                label: string;
            }[] | undefined;
        }[];
    };
    update: {
        data: {
            type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
            label: string;
            required: boolean;
            placeholder: string;
            options: {
                type: string;
                label: string;
            }[] | undefined;
        };
        where: {
            id: number;
        };
    }[];
};
export declare function ensureUniqueBookingFields(fields: z.infer<typeof EventTypeUpdateInput>["bookingFields"]): void;
type Host = {
    userId: number;
    isFixed?: boolean | undefined;
    priority?: number | null | undefined;
    weight?: number | null | undefined;
};
export declare function addWeightAdjustmentToNewHosts({ hosts, isWeightsEnabled, eventTypeId, prisma, }: {
    hosts: Host[];
    isWeightsEnabled: boolean;
    eventTypeId: number;
    prisma: PrismaClient;
}): Promise<(Host & {
    weightAdjustment?: number;
})[]>;
export declare const mapEventType: (eventType: EventType) => Promise<{
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
}>;
export {};
