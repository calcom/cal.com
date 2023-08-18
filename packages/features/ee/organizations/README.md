# Organizations feature

From the [Original RFC](https://github.com/calcom/cal.com/issues/7142):

> We want to create organisations within Cal.com to enable people to easily and effectively manage multiple teams. An organisation will live above the current teams layer.

## Setup

1. Set `ORGANIZATIONS_ENABLED=1` in .env

1. Add `app.cal.local` to your host file, either:  
   a. `sudo npx hostile app.cal.local`  
   b. Add it yourself

1. Add `acme.cal.local` to host file (I use this as an org name for testing public URLS)

1. Visit `/settings/organizations/new` → follow setup steps with the slug matching the org slug from step 3

1. You should now be in ORG context.

1. You may or may not need the feature flag enabled.
