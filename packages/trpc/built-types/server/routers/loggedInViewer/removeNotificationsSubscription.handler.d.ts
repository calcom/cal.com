import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TRemoveNotificationsSubscriptionInputSchema } from "./removeNotificationsSubscription.schema";
type AddSecondaryEmailOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TRemoveNotificationsSubscriptionInputSchema;
};
export declare const removeNotificationsSubscriptionHandler: ({ ctx, input }: AddSecondaryEmailOptions) => Promise<{
    message: string;
}>;
export {};
