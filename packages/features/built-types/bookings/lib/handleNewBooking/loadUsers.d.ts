import { Prisma } from "@prisma/client";
import type { IncomingMessage } from "http";
import type { NewBookingEventType } from "./types";
type EventType = Pick<NewBookingEventType, "hosts" | "users" | "id">;
export declare const loadUsers: (eventType: EventType, dynamicUserList: string[], req: IncomingMessage) => Promise<({
    metadata: Prisma.JsonValue;
    theme: string | null;
    id: number;
    name: string | null;
    email: string;
    timeZone: string;
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
    username: string | null;
    locale: string | null;
    startTime: number;
    endTime: number;
    hideBranding: boolean;
    brandColor: string | null;
    darkBrandColor: string | null;
    timeFormat: number | null;
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
    bufferTime: number;
    defaultScheduleId: number | null;
    allowDynamicBooking: boolean | null;
} & {
    credentials: {
        invalid: boolean | null;
        type: string;
        id: number;
        key: Prisma.JsonValue;
        user: {
            email: string;
        } | null;
        userId: number | null;
        teamId: number | null;
        appId: string | null;
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
            metadata: Prisma.JsonValue;
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
        }, "metadata" | "id" | "name" | "slug" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
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
            id: number;
            name: string | null;
            email: string;
            username: string | null;
            locale: string | null;
            startTime: number;
            endTime: number;
            avatarUrl: string | null;
            bufferTime: number;
            defaultScheduleId: number | null;
            isPlatformManaged: boolean;
        };
        id: number;
        organizationId: number;
        userId: number;
        uid: string;
        username: string;
        createdAt: Date & string;
        updatedAt: Date & string;
        upId: string;
    } | null;
    metadata: Prisma.JsonValue;
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
        key: Prisma.JsonValue;
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
}[]>;
export type AwaitedLoadUsers = Awaited<ReturnType<typeof loadUsers>>;
export {};
//# sourceMappingURL=loadUsers.d.ts.map