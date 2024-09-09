import type Stripe from "stripe";
interface RedirectArgs {
    userId: number;
    appSlug: string;
    appPaidMode: string;
    priceId: string;
    trialDays?: number;
}
export declare const withPaidAppRedirect: ({ appSlug, appPaidMode, priceId, userId, trialDays, }: RedirectArgs) => Promise<string | null>;
export declare const withStripeCallback: (checkoutId: string, appSlug: string, callback: (args: {
    checkoutSession: Stripe.Checkout.Session;
}) => Promise<{
    url: string;
}>) => Promise<{
    url: string;
}>;
export {};
//# sourceMappingURL=paid-apps.d.ts.map