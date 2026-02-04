/**
 * Maps app slugs to display names for payment apps
 * Falls back to slug itself if not in map
 */
const APP_SLUG_TO_NAME: Record<string, string> = {
    stripe: "Stripe",
    paypal: "Paypal",
    alby: "Alby",
    hitpay: "HitPay",
    btcpayserver: "BTCPayServer",
};

export function getAppNameFromSlug({ appSlug }: { appSlug: string | null }): string {
    if (!appSlug) {
        return "Unknown App";
    }
    return APP_SLUG_TO_NAME[appSlug] ?? appSlug;
}
