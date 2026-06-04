<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://github.com/calcom/cal.diy">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
</div>

# Stripe Payment Integration

Stripe payment integration for Cal.diy. All code is licensed under the [MIT License](../../../LICENSE).

## Setting up Stripe

1. Create a stripe account or use an existing one. For testing, you should use all stripe dashboard functions with the Test-Mode toggle in the top right activated.
2. Open [Stripe ApiKeys](https://dashboard.stripe.com/apikeys) save the token starting with `pk_...` to `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` and `sk_...` to `STRIPE_PRIVATE_KEY` in the .env file.
3. Open [Stripe Connect Settings](https://dashboard.stripe.com/settings/connect) and activate OAuth for Standard Accounts
4. Add `<CALENDSO URL>/api/integrations/stripepayment/callback` as redirect URL.
5. Copy your client*id (`ca*...`) to `STRIPE_CLIENT_ID` in the .env file.
6. Open [Stripe Webhooks](https://dashboard.stripe.com/webhooks) and add `<CALENDSO URL>/api/integrations/stripepayment/webhook` as webhook for connected applications.
7. Select all `payment_intent` events for the webhook.
8. Copy the webhook secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET` in the .env file.
