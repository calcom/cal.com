import type { Webhook } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type GetByViewerOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
type WebhookGroup = {
    teamId?: number | null;
    profile: {
        slug: string | null;
        name: string | null;
        image?: string;
    };
    metadata?: {
        readOnly: boolean;
    };
    webhooks: Webhook[];
};
export type WebhooksByViewer = {
    webhookGroups: WebhookGroup[];
    profiles: {
        readOnly?: boolean | undefined;
        slug: string | null;
        name: string | null;
        image?: string | undefined;
        teamId: number | null | undefined;
    }[];
};
export declare const getByViewerHandler: ({ ctx }: GetByViewerOptions) => Promise<{
    webhookGroups: {
        teamId?: number | null | undefined;
        profile: {
            slug: string | null;
            name: string | null;
            image?: string | undefined;
        };
        metadata?: {
            readOnly: boolean;
        } | undefined;
        webhooks: {
            id: string;
            userId: number | null;
            teamId: number | null;
            eventTypeId: number | null;
            platformOAuthClientId: string | null;
            subscriberUrl: string;
            payloadTemplate: string | null;
            createdAt: Date;
            active: boolean;
            eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
            appId: string | null;
            secret: string | null;
            platform: boolean;
        }[];
    }[];
    profiles: {
        readOnly?: boolean | undefined;
        slug: string | null;
        name: string | null;
        image?: string | undefined;
        teamId: number | null | undefined;
    }[];
}>;
export {};
