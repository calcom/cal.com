import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetInputSchema } from "./get.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetInputSchema;
};
export declare const getHandler: ({ ctx: _ctx, input }: GetOptions) => Promise<{
    id: string;
    userId: number | null;
    teamId: number | null;
    secret: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
    platform: boolean;
}>;
export {};
