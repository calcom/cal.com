import Stripe from "stripe";
import { z } from "zod";
export type StripePaymentData = Stripe.Response<Stripe.PaymentIntent> & {
    stripe_publishable_key: string;
    stripeAccount: string;
};
export type StripeSetupIntentData = {
    setupIntent: Stripe.Response<Stripe.SetupIntent>;
    paymentIntent?: StripePaymentData;
};
export declare const stripeOAuthTokenSchema: z.ZodObject<{
    access_token: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    livemode: z.ZodOptional<z.ZodBoolean>;
    token_type: z.ZodOptional<z.ZodLiteral<"bearer">>;
    refresh_token: z.ZodOptional<z.ZodString>;
    stripe_user_id: z.ZodOptional<z.ZodString>;
    stripe_publishable_key: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    access_token?: string | undefined;
    scope?: string | undefined;
    livemode?: boolean | undefined;
    token_type?: "bearer" | undefined;
    refresh_token?: string | undefined;
    stripe_user_id?: string | undefined;
    stripe_publishable_key?: string | undefined;
}, {
    access_token?: string | undefined;
    scope?: string | undefined;
    livemode?: boolean | undefined;
    token_type?: "bearer" | undefined;
    refresh_token?: string | undefined;
    stripe_user_id?: string | undefined;
    stripe_publishable_key?: string | undefined;
}>;
export declare const stripeDataSchema: z.ZodObject<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodOptional<z.ZodString>;
    token_type: z.ZodOptional<z.ZodLiteral<"bearer">>;
    scope: z.ZodOptional<z.ZodString>;
    livemode: z.ZodOptional<z.ZodBoolean>;
    stripe_user_id: z.ZodOptional<z.ZodString>;
    stripe_publishable_key: z.ZodOptional<z.ZodString>;
    default_currency: z.ZodString;
}, "strip", z.ZodTypeAny, {
    default_currency: string;
    refresh_token?: string | undefined;
    access_token?: string | undefined;
    token_type?: "bearer" | undefined;
    scope?: string | undefined;
    livemode?: boolean | undefined;
    stripe_user_id?: string | undefined;
    stripe_publishable_key?: string | undefined;
}, {
    default_currency: string;
    refresh_token?: string | undefined;
    access_token?: string | undefined;
    token_type?: "bearer" | undefined;
    scope?: string | undefined;
    livemode?: boolean | undefined;
    stripe_user_id?: string | undefined;
    stripe_publishable_key?: string | undefined;
}>;
export type StripeData = z.infer<typeof stripeDataSchema>;
declare const stripe: Stripe;
export default stripe;
//# sourceMappingURL=server.d.ts.map