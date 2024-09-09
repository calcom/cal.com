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
    eventTypeId: number | null;
    createdAt: Date;
    teamId: number | null;
    secret: string | null;
    appId: string | null;
    platformOAuthClientId: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
    platform: boolean;
} | null>;
export {};
