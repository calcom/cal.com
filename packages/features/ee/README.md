<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://cal.com/enterprise">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
  
  <a href="https://cal.com/sales">Get a License Key</a>
</div>

# Enterprise Edition

Welcome to the Enterprise Edition ("/ee") of Cal.com.

The [/ee](https://github.com/calcom/cal.com/tree/main/packages/features/ee) subfolder is the place for all the **Enterprise Edition** features from our [hosted](https://cal.com/pricing) plan and enterprise-grade features for [Enterprise](https://cal.com/enterprise) such as SSO, SAML, OIDC, SCIM, SIEM and much more or [Platform](https://cal.com/platform) plan to build a marketplace.

> _❗ WARNING: This repository is copyrighted (unlike our [main repo](https://github.com/calcom/cal.com)). You are not allowed to use this code to host your own version of app.cal.com without obtaining a proper [license](https://cal.com/sales) first❗_

## Setting up Stripe

1. Create a stripe account or use an existing one. For testing, you should use all stripe dashboard functions with the Test-Mode toggle in the top right activated.
2. Open [Stripe ApiKeys](https://dashboard.stripe.com/apikeys) save the token starting with `pk_...` to `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` and `sk_...` to `STRIPE_PRIVATE_KEY` in the .env file.
3. Open [Stripe Connect Settings](https://dashboard.stripe.com/settings/connect) and activate OAuth for Standard Accounts
4. Add `<CALENDSO URL>/api/integrations/stripepayment/callback` as redirect URL.
5. Copy your client*id (`ca*...`) to `STRIPE_CLIENT_ID` in the .env file.
6. Open [Stripe Webhooks](https://dashboard.stripe.com/webhooks) and add `<CALENDSO URL>/api/integrations/stripepayment/webhook` as webhook for connected applications.
7. Select all `payment_intent` events for the webhook.
8. Copy the webhook secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET` in the .env file.

## Setting up SAML login

1. Set SAML_DATABASE_URL to a postgres database. Please use a different database than the main Cal instance since the migrations are separate for this database. For example `postgresql://postgres:@localhost:5450/cal-saml`
2. Set SAML_ADMINS to a comma separated list of admin emails from where the SAML metadata can be uploaded and configured.
3. Create a SAML application with your Identity Provider (IdP) using the instructions here - [SAML Setup](../../apps/web/docs/saml-setup.md)
4. Remember to configure access to the IdP SAML app for all your users (who need access to Cal).
5. You will need the XML metadata from your IdP later, so keep it accessible.
6. Log in to one of the admin accounts configured in SAML_ADMINS and then navigate to Settings -> Security.
7. You should see a SAML configuration section, copy and paste the XML metadata from step 5 and click on Save.
8. Your provisioned users can now log into Cal using SAML.
