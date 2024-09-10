import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TEditInputSchema } from "./edit.schema";
type EditOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TEditInputSchema;
};
export declare const editHandler: ({ input, ctx }: EditOptions) => Promise<{
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
} | null>;
export {};
