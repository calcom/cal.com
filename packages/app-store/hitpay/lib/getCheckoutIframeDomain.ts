import { API_HITPAY, SANDBOX_API_HITPAY } from "@calcom/app-store/hitpay/lib/constants";

// HitPay's checkout URL uses a securecheckout./checkout. subdomain (V1/V2) that must be stripped to get the iframe's real domain.
const CHECKOUT_V1_SUBDOMAIN = "securecheckout";
const CHECKOUT_V2_SUBDOMAIN = "checkout";
const CHECKOUT_SUBDOMAIN_PATTERN = new RegExp(`^(${CHECKOUT_V1_SUBDOMAIN}|${CHECKOUT_V2_SUBDOMAIN})\\.`);

// Reuses the same env-configurable constants as the rest of the HitPay integration. Skips any that
// aren't valid URLs so a misconfigured env var can't crash the module at import time.
const ALLOWED_IFRAME_HOSTS = [API_HITPAY, SANDBOX_API_HITPAY].flatMap((url) => {
  try {
    return [new URL(url).hostname.replace(/^api\./, "")];
  } catch {
    return [];
  }
});

// Guards against an untrusted host picking the iframe's origin.
function isTrustedHitPayHost(hostname: string): boolean {
  return ALLOWED_IFRAME_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

export function getCheckoutIframeDomain(paymentUrl: string): string | undefined {
  try {
    const { hostname } = new URL(paymentUrl);
    const domain = hostname.replace(CHECKOUT_SUBDOMAIN_PATTERN, "");

    return isTrustedHitPayHost(domain) ? domain : undefined;
  } catch {
    return undefined;
  }
}
