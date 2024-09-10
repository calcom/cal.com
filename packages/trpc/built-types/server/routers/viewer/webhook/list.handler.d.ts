import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TListInputSchema } from "./list.schema";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TListInputSchema;
};
export declare const listHandler: ({ ctx, input }: ListOptions) => Promise<{
    id: string;
    userId: number | null;
    teamId: number | null;
    eventTypeId: number | null;
    createdAt: Date;
    appId: string | null;
    platformOAuthClientId: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
    secret: string | null;
    platform: boolean;
}[]>;
export {};
