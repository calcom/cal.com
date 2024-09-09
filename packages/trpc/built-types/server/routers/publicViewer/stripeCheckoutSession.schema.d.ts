import { z } from "zod";
export declare const ZStripeCheckoutSessionInputSchema: z.ZodEffects<z.ZodObject<{
    stripeCustomerId: z.ZodOptional<z.ZodString>;
    checkoutSessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    stripeCustomerId?: string | undefined;
    checkoutSessionId?: string | undefined;
}, {
    stripeCustomerId?: string | undefined;
    checkoutSessionId?: string | undefined;
}>, {
    stripeCustomerId?: string | undefined;
    checkoutSessionId?: string | undefined;
}, {
    stripeCustomerId?: string | undefined;
    checkoutSessionId?: string | undefined;
}>;
export type TStripeCheckoutSessionInputSchema = z.infer<typeof ZStripeCheckoutSessionInputSchema>;
