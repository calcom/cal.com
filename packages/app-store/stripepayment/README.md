<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://cal.com/enterprise">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
  
  <a href="https://cal.com/enterprise">Get Started with Enterprise</a>
</div>

# Enterprise Edition

Welcome to the Enterprise Edition ("/ee") of Cal.com.

The [/ee](https://github.com/calcom/cal.com/tree/main/apps/web/ee) subfolder is the place for all the **Pro** features from our [hosted](https://cal.com/pricing) plan and [enterprise-grade](https://cal.com/enterprise) features such as SSO, SAML, ADFS, OIDC, SCIM, SIEM, HRIS and much more.

> _❗ WARNING: This package is copyrighted (unlike our [main repo](https://github.com/calcom/cal.com)). You are not allowed to use this code to host your own version of app.cal.com without obtaining a proper [license](https://cal.com/enterprise) first❗_

## Setting up Stripe

1. Create a stripe account or use an existing one. For testing, you should use all stripe dashboard functions with the Test-Mode toggle in the top right activated.
2. Open [Stripe ApiKeys](https://dashboard.stripe.com/apikeys) save the token starting with `pk_...` to `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` and `sk_...` to `STRIPE_PRIVATE_KEY` in the .env file.
3. Open [Stripe Connect Settings](https://dashboard.stripe.com/settings/connect) and activate OAuth for Standard Accounts
4. Add `<CALENDSO URL>/api/integrations/stripepayment/callback` as redirect URL.
5. Copy your client*id (`ca*...`) to `STRIPE_CLIENT_ID` in the .env file.
6. Open [Stripe Webhooks](https://dashboard.stripe.com/webhooks) and add `<CALENDSO URL>/api/integrations/stripepayment/webhook` as webhook for connected applications.
7. Select all `payment_intent` events for the webhook.
8. Copy the webhook secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET` in the .env file.

## Enabling Adaptive Currencies

Stripe Adaptive Currencies (now called Adaptive Pricing) automatically converts prices to local currencies based on customer IP address and works with Checkout Sessions used in subscription flows.

### Setup Steps:

1. **Enable Adaptive Pricing in Stripe Dashboard:**
   - Navigate to [Stripe Dashboard → Connect → Settings](https://dashboard.stripe.com/settings/connect)
   - Enable "Adaptive pricing" under the Connect settings
   - Configure supported currencies and regions as needed

2. **Verify Webhook Configuration:**
   - Ensure your webhook endpoint handles `checkout.session.completed` events
   - Currency conversion metadata will be included in webhook payloads
   - No additional webhook events are required for Adaptive Currencies

3. **Test Configuration:**
   - Use VPN or proxy to test from different geographic locations (focus on USD/EUR regions)
   - Verify that checkout sessions automatically display local currencies
   - Confirm that webhook events include proper currency conversion data

### Supported Flows:

- ✅ Team/Organization subscriptions (`packages/features/ee/teams/lib/payments.ts`)
- ✅ Premium username subscriptions (`packages/app-store/stripepayment/api/subscription.ts`)  
- ✅ Platform billing subscriptions (`apps/api/v2/src/modules/billing/services/billing.service.ts`)
- ❌ Booking payments (uses Payment Intents API, not compatible with Adaptive Currencies)

### Currency Behavior:

- **With Adaptive Pricing enabled**: Stripe automatically detects customer location and converts prices to local currency
- **Without Adaptive Pricing**: Stripe uses your account's default currency setting
- **No environment variables needed**: Currency handling is managed entirely by Stripe based on Dashboard configuration

### Notes:

- Adaptive Currencies only works with Stripe Checkout Sessions, not Payment Intents
- Currency conversion is handled automatically by Stripe based on customer location
- No code changes are required - currency parameter is omitted to allow Stripe's automatic handling
- All subscription flows in Cal.com already use compatible Checkout Sessions
