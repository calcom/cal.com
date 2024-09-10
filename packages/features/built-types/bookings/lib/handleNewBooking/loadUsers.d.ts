import { Prisma } from "@prisma/client";
import type { IncomingMessage } from "http";
import type { NewBookingEventType } from "./types";
type EventType = Pick<NewBookingEventType, "hosts" | "users" | "id">;
export declare const loadUsers: (eventType: EventType, dynamicUserList: string[], req: IncomingMessage) => Promise<({
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
    metadata: Prisma.JsonValue;
    destinationCalendar: {
        id: number;
        integration: string;
        externalId: string;
        primaryEmail: string | null;
        userId: number | null;
        eventTypeId: number | null;
        credentialId: number | null;
    } | null;
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
            startTime: Date;
            endTime: Date;
            days: number[];
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
        user: {
            email: string;
        } | null;
        userId: number | null;
        teamId: number | null;
        key: Prisma.JsonValue;
        appId: string | null;
        invalid: boolean | null;
    }[];
})[]>;
/**
 * This method is mostly same as the one in UserRepository but it includes a lot more relations which are specific requirement here
 * TODO: Figure out how to keep it in UserRepository and use it here
 */
export declare const findUsersByUsername: ({ usernameList, orgSlug, }: {
    orgSlug: string | null;
    usernameList: string[];
}) => Promise<{
    organizationId: number | null;
    profile: {
        organization: Omit<{
            name: string;
            id: number;
            metadata: Prisma.JsonValue;
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
            metadata: Prisma.JsonValue;
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
        user: {
            name: string | null;
            email: string;
            id: number;
            locale: string | null;
            username: string | null;
            avatarUrl: string | null;
            startTime: number;
            endTime: number;
            bufferTime: number;
            defaultScheduleId: number | null;
            isPlatformManaged: boolean;
        };
        id: number;
        organizationId: number;
        username: string;
        uid: string;
        userId: number;
        createdAt: Date & string;
        updatedAt: Date & string;
        upId: string;
    } | null;
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
    metadata: Prisma.JsonValue;
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
        key: Prisma.JsonValue;
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
}[]>;
export type AwaitedLoadUsers = Awaited<ReturnType<typeof loadUsers>>;
export {};
//# sourceMappingURL=loadUsers.d.ts.map