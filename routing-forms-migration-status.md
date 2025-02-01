# Routing Forms Migration Status

## Overview
- We are migrating Routing Forms from packages/app-store to @calcom/features/routing-forms
- Pages exist in apps/web/pages/routing-forms
- Migration is in progress

## Rules
- No file must be imported from @calcom/app-store/routing-forms. All files must be moved to their respective places outside app-store
- We don't want package.json in features/routing-forms
- Other apps like salesforce must be imported from the old place which is @calcom/app-store. Only Routing Form is migrated
- All [..appPages].tsx files should be renamed to index.tsx
- prisma, user, ssrInit aren't valid getServerSideProps parameters. Use the supported parameters and import the everything else. Refer to existing getServerSideProps functions for reference
- We need enrichFormWithMigrationData where it is. Don't remove it.
- We do't need appUrl now as it is not an app anymore. We can use reguarl WEBAPP_URL
- @calcom/routing-forms -> becomes -> @calcom/features/routing-forms
- @calcom/features/routing-forms/lib must be used instead of @calcom/web/lib/routing-forms. We can delete the apps/web/lib/routing-forms directory if all files are there in @calcom/features/routing-forms/lib
- Relative imports like ../../components/SingleForm should be updated to @calcom/features/routing-forms/components/SingleForm in all page routes in apps/web/pages/routing-forms
- Repositories are class  with static methods.
- There must not be features/routing-form/pages directory. All pages should be in apps/web/pages/routing-forms
- Ask for error logs of server or TS logs if request fails to verify

🚧 In Progress:
- Getting verification script to pass

❌ Issues Fixed:
- Import error in appDataSchemas.ts trying to import salesforce from wrong location
- Verification script failing for /routing-forms/form-edit endpoint due to incorrect getServerSideProps setup

## Next Steps
1. routing-link route is failing
1. Get all verification script endpoints passing
2. Remove the old routing-forms directory from app-store once verified

## Verification
- We have a verification script  node scripts/verify-routing-forms-migration.js that should have passing endpoints
- Current status: ❌ Not passing