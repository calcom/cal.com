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
    eventTypeId: number | null;
    createdAt: Date;
    teamId: number | null;
    appId: string | null;
    platformOAuthClientId: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
    secret: string | null;
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
    eventTypeId: number | null;
    createdAt: Date;
    teamId: number | null;
    appId: string | null;
    platformOAuthClientId: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
    secret: string | null;
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
    status: import(".prisma/client").$Enums.BookingStatus;
    description: string | null;
    user: {
        name: string | null;
        email: string;
        locale: string | null;
        username: string | null;
        timeZone: string;
    } | null;
    startTime: Date;
    endTime: Date;
    eventType: {
        length: number;
        description: string | null;
        team: {
            name: string;
            id: number;
            bio: string | null;
            timeZone: string;
            weekStart: string;
            hideBranding: boolean;
            theme: string | null;
            timeFormat: number | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            metadata: Prisma.JsonValue;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
            createdAt: Date;
            slug: string | null;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            bannerUrl: string | null;
            parentId: number | null;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
        } | null;
        title: string;
        bookingFields: Prisma.JsonValue;
        requiresConfirmation: boolean;
        price: number;
        currency: string;
    } | null;
    attendees: {
        name: string;
        email: string;
        timeZone: string;
    }[];
    title: string;
    customInputs: Prisma.JsonValue;
    cancellationReason: string | null;
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
        name: string | null;
        email: string;
        id: number;
        timeZone: string;
    };
    createdAt: Date;
    updatedAt: Date;
    start: Date;
    end: Date;
    uuid: string;
    reasonId: number | null;
    notes: string | null;
    toUser: {
        name: string | null;
        email: string;
        id: number;
        timeZone: string;
    } | null;
    reason: {
        reason: string;
        emoji: string;
    } | null;
}[] | undefined>;
//# sourceMappingURL=scheduleTrigger.d.ts.map