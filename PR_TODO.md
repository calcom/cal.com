Description:
- Org is now created only through stripe webhook and thus code has been adapted to be idempotent in case of retries from Stripe when failure happens.
- We store the complete progress of the onboarding in OrganizationOnboarding table including any error that last happened and the end of lifecycle with isComplete set to true.
- Admin can configure a custom price for a customer(identified by email) and handover the onboarding to the customer(through a handover onboarding link). In this way, the customer still setups the onboarding himself but pays a custom price.
- Admin Doing organization onboarding on behalf of an email that doesn't exist in our system, is temporarily disabled. [Can be enabled in the future if needed]
- Earlier Organization onboarding updated DB step by step but now in one go after the payment, we create everything - Domain Creation, Org Setup, Teams Creation, Teams Migration, Migrating Teams' members migration, member invitations. So, we have been extra careful with the logic to ensure errors don;t occur and if occur they are retried by webhook and also recorded in OrganizationOnboarding table.

Deprecations/Removals:
- NEXT_PUBLIC_ORGANIZATIONS_SELF_SERVE_PRICE env variable is removed and user must set NEXT_PUBLIC_ORGANIZATIONS_SELF_SERVE_PRICE_NEW with the difference that it doesn't have 00 in the end (37 instead of 3700 now). Reason was that 00 is a stripe specific thing and also because we store the price in DB with OrganizationOnboarding record and it doesn't make sense for it to be 3700 when infact it is 37.

Deployment Plan:
- [ ] Need Stripe Product ID in Env variable
- [ ] Set NEXT_PUBLIC_ORGANIZATIONS_SELF_SERVE_PRICE_NEW to 37


TODO:
- [ ] Change onboarding.id to a uuid
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
- [ ] Test inviting members from the members page, increases the seats in the subscription.
- [ ] Test a scenario where a team is moved with same slug as the organization's slug being moved to.
- [x] Onboarding First Step(Organization)
     - [x] Error when user is already a part of an organization.
     - [x] Error when slug is taken by another organization.
- [x] Onboarding First Step(Platform)


Followup Improvements:
 - [ ] If due to the number of people being invited during the onboarding if the seats increase, we should show that as a toast in the last onboarding step
 - [ ] Onboarding handover URL should take the user to the first step(intead of second step) where he could review the org and price details first
 - [ ] Allow admin to change the price of an existing onboarding. This is important because the admin might need to change the price of the onboarding after it is created and there can only be one onboarding for an orgOwner email.
 - [ ] Logo upload isn't working form onboarding(Existing bug)
 - [ ] Send telemetry event for org creation,
 - [ ]  What if renewal of plan fails? Need to handle that.
 - [ ] OrganizationOnboarding schema should be created through intentToCreateOrgHandler and rest of the flow should just update it. This could be important because we do a lot of validation in intentToCreateOrgHandler and without that we shouldn't allow organization to be created and thus no-onboarding should happen.
 - [ ]  Consider showing what each step in onboarding does, like some indication in front of all steps viewable at once.
 - [ ]  Allow going back to previous steps.
