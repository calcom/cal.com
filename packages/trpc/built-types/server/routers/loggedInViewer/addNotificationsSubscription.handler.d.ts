import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TAddNotificationsSubscriptionInputSchema } from "./addNotificationsSubscription.schema";
type AddSecondaryEmailOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAddNotificationsSubscriptionInputSchema;
};
export declare const addNotificationsSubscriptionHandler: ({ ctx, input }: AddSecondaryEmailOptions) => Promise<{
    message: string;
}>;
export {};
