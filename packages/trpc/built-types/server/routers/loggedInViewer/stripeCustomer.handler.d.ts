import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type StripeCustomerOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const stripeCustomerHandler: ({ ctx }: StripeCustomerOptions) => Promise<{
    isPremium: boolean;
    username: string | null;
}>;
export {};
