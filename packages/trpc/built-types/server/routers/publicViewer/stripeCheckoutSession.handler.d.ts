import type { TStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";
type StripeCheckoutSessionOptions = {
    input: TStripeCheckoutSessionInputSchema;
};
export declare const stripeCheckoutSessionHandler: ({ input }: StripeCheckoutSessionOptions) => Promise<{
    valid: boolean;
    hasPaymentFailed?: undefined;
    isPremiumUsername?: undefined;
    customer?: undefined;
} | {
    valid: boolean;
    hasPaymentFailed: boolean;
    isPremiumUsername: boolean;
    customer: {
        username: string;
        email: string;
        stripeCustomerId: string;
    };
}>;
export default stripeCheckoutSessionHandler;
