import type { Prisma, Webhook } from "@prisma/client";
import type { ApiKey } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
export declare function addSubscription({ appApiKey, triggerEvent, subscriberUrl, appId, account, }: {
    appApiKey?: ApiKey;
    triggerEvent: WebhookTriggerEvents;
    subscriberUrl: string;
    appId: string;
    account?: {
        id: number;
        name: string | null;
        isTeam: boolean;
    } | null;
}): Promise<{
    id: string;
    userId: number | null;
    teamId: number | null;
    eventTypeId: number | null;
    createdAt: Date;
    secret: string | null;
    appId: string | null;
    platformOAuthClientId: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
    platform: boolean;
} | undefined>;
export declare function deleteSubscription({ appApiKey, webhookId, appId, account, }: {
    appApiKey?: ApiKey;
    webhookId: string;
    appId: string;
    account?: {
        id: number;
        name: string | null;
        isTeam: boolean;
    } | null;
}): Promise<{
    id: string;
    userId: number | null;
    teamId: number | null;
    eventTypeId: number | null;
    createdAt: Date;
    secret: string | null;
    appId: string | null;
    platformOAuthClientId: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
    platform: boolean;
} | undefined>;
export declare function listBookings(appApiKey?: ApiKey, account?: {
    id: number;
    name: string | null;
    isTeam: boolean;
} | null): Promise<{
    location: string;
    userFieldsResponses: import("@calcom/types/Calendar").CalEventResponses;
    responses: import("@calcom/types/Calendar").CalEventResponses;
    title: string;
    eventType: {
        title: string;
        length: number;
        description: string | null;
        bookingFields: Prisma.JsonValue;
        requiresConfirmation: boolean;
        price: number;
        currency: string;
        team: {
            metadata: Prisma.JsonValue;
            theme: string | null;
            id: number;
            name: string;
            timeZone: string;
            slug: string | null;
            parentId: number | null;
            createdAt: Date;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            bio: string | null;
            hideBranding: boolean;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            brandColor: string | null;
            darkBrandColor: string | null;
            bannerUrl: string | null;
            timeFormat: number | null;
            weekStart: string;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
        } | null;
    } | null;
    status: import(".prisma/client").$Enums.BookingStatus;
    description: string | null;
    user: {
        name: string | null;
        email: string;
        timeZone: string;
        username: string | null;
        locale: string | null;
    } | null;
    customInputs: Prisma.JsonValue;
    cancellationReason: string | null;
    attendees: {
        name: string;
        email: string;
        timeZone: string;
    }[];
    startTime: Date;
    endTime: Date;
}[] | undefined>;
export declare function scheduleTrigger({ booking, subscriberUrl, subscriber, triggerEvent, }: {
    booking: {
        id: number;
        endTime: Date;
        startTime: Date;
    };
    subscriberUrl: string;
    subscriber: {
        id: string;
        appId: string | null;
    };
    triggerEvent: WebhookTriggerEvents;
}): Promise<void>;
export declare function deleteWebhookScheduledTriggers({ booking, appId, triggerEvent, webhookId, userId, teamId, }: {
    booking?: {
        id: number;
        uid: string;
    };
    appId?: string | null;
    triggerEvent?: WebhookTriggerEvents;
    webhookId?: string;
    userId?: number;
    teamId?: number;
}): Promise<void>;
export declare function updateTriggerForExistingBookings(webhook: Webhook, existingEventTriggers: WebhookTriggerEvents[], updatedEventTriggers: WebhookTriggerEvents[]): Promise<void>;
export declare function listOOOEntries(appApiKey?: ApiKey, account?: {
    id: number;
    name: string | null;
    isTeam: boolean;
} | null): Promise<{
    id: number;
    user: {
        id: number;
        name: string | null;
        email: string;
        timeZone: string;
    };
    notes: string | null;
    end: Date;
    start: Date;
    reason: {
        reason: string;
        emoji: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
    uuid: string;
    reasonId: number | null;
    toUser: {
        id: number;
        name: string | null;
        email: string;
        timeZone: string;
    } | null;
}[] | undefined>;
//# sourceMappingURL=scheduleTrigger.d.ts.map