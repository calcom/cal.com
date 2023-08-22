# Organizations feature

From the [Original RFC](https://github.com/calcom/cal.com/issues/7142):

> We want to create organisations within Cal.com to enable people to easily and effectively manage multiple teams. An organisation will live above the current teams layer.

## Quick start

1. Set `ORGANIZATIONS_ENABLED=1` in .env
1. Add `app.cal.local` to your host file, either:  
   a. `sudo npx hostile app.cal.local`  
   b. Add it yourself
1. Add `acme.cal.local` to host file (I use this as an org name for testing public URLS)
1. Visit `/settings/organizations/new` → follow setup steps with the slug matching the org slug from step 3
1. You should now be in ORG context.
1. You may or may not need the feature flag enabled.

## Environment variables

`CALCOM_LICENSE_KEY`: Since Organizations is an EE feature, a license key should be present, either as this environment variable or visiting as an Admin `/auth/setup`
`NEXT_PUBLIC_WEBAPP_URL`: In case of local development, this variable should be set to `https://app.cal.local:3000` to be able to handle subdomains
`NEXTAUTH_URL`: Should be equal to `NEXT_PUBLIC_WEBAPP_URL`
`NEXTAUTH_COOKIE_DOMAIN`: In case of local development, this variable should be set to `.cal.local` to be able to accept session cookies in subdomains as well otherwise it should be set to the corresponding environment such as `.cal.dev`, `.cal.qa` or `.cal.com`
`ORGANIZATIONS_ENABLED`: Should be set to `1`
`STRIPE_ORG_MONTHLY_PRICE_ID`: For dev and all testing should be set to your own testing key. Or ask for the shared key if you're a core member.

## Feature flag

Organizations has an operational feature flag in order to turn on the entire feature, be sure to log in as Admin and visit Features section in Settings to turn on/off this feature.

## Domain setup

When a new organization is created, a subdomain can be used with Cal App to show public profiles for the organization per se, their teams and their members.

When working locally, the app works under the subdomain `app.cal.local:3000` and any organization works under `acme.cal.local:3000` which will need to have acme.cal.local mapped in your system hosts file to point to `127.0.0.1` to be able to see the mentioned public profiles.

When working in any other environment, the subdomain registration works with Vercel API, to assign the organization subdomain like acme.cal.dev to work with the app. Depending on whether the domain's DNS such as cal.dev in the previous example is being managed by Vercel or an external service such as Cloudflare, the subdomain registration may need manual steps. This is going to be automated in the near future.
