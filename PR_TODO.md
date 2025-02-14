Deployment Plan:
- Need Stripe Product ID in Env variable

TODO:
- [x] PLATFORM: We need to create the organization without requiring payment first.
- [x] BUG: logo and bio not bieng saved to Onboarding/Organization
- [x] Verify if we have the logic to allow creating an organization with owner as the email for which the user doesn't have an account already.
- [x] Make sure that we pass creationSource to createTeamsMutation.mutate
- [ ] Refreshing on onboarding once it is complete should redirect to Organization profile page in dashboard.
- [x] Test admin creation flow.
- [ ] Even though the payment succeeds, the organization setup might fail. Possible failure reasons are below. We should record the failure in organizationOnboarding table.
     - Organization slug conflict. Taken by some other organization. As soon as the onboarding is complete, the organization slug is reserved.
     - Domain setup - Vercel/Cloudflare domain creation might fail.
     - There could be soft errors like - certain users that couldn't be invited. Possibly some teams that couldn't be migrated
- [x] Failed payment handling
- [x] auto-accept invite doesn't seem to be working
- [x] createTeams.handler No subscriptionId found in team metadata when moving team members via onboarding
- [x] We need to reuse some of trpc/server/routers/viewer/organizations/create.handler.ts logic to start creating subdomains which isn't happening in _invoice.paid.org.ts at the moment.
- [x] Organization slug conflict in onboarding
     - [x] There could be many different users that are checking out organization with same slug. The first one to checkout should win.
- [x] We should flush onboarding store(useOnboardingStore) after the organizationOnboarding DB entry is created. Because persisted data in localStorage could accidentally get reused by admin for creating other organizations.
- [x] checkout flow 
     - [x] checkout button should be disabled till createWithPaymentIntent request completes.
     - [x] checkout button should show a spinner when loading.
     - [x] Errors from createWithPaymentIntent aren't being shown in UI.
     - [x] "You already have a pending organization" error must not be shown if it is the same organization that is being created.
     - [x] Handle payment failure. Maybe create a new page for failure like success page.
     
- [x] Also we need to move the core logic from _invoice.paid.org.ts to somewhere else and just have import in there.
- [x] Webhook could be retried by Stripe and thus we need to handle duplicates/existing records and be able to fix the data in DB.
- Schema
     - OrganizationOnboarding schema should be unaware of the Payment app being used. We might need to move to another payment service as well.
     

- Cleanup
     - [x] We don't need team.metadata.requestedSlug for organizations as organization is created only after confirmation.
Bugs:
- [x] When teams are added(in AddNewTeamsForm), they are persisted but aren't shown in the UI after refresh.

Testing:
- [ ] Test Emails
- [ ] Test a scenario where a team is moved with same slug as the organization's slug being moved to.
- [x] Onboarding First Step(Organization)
     - [x] Error when user is already a part of an organization.
     - [x] Error when slug is taken by another organization.
- [x] Onboarding First Step(Platform)


Followup Improvements:
 - [ ]  What if renewal of plan fails? Need to handle that.
 - [ ] OrganizationOnboarding schema should be created through intentToCreateOrgHandler and rest of the flow should just update it. This could be important because we do a lot of validation in intentToCreateOrgHandler and without that we shouldn't allow organization to be created and thus no-onboarding should happen.
 - [ ]  Consider showing what each step in onboarding does, like some indication in front of all steps viewable at once.
 - [ ]  Allow going back to previous steps.
