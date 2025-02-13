TODO:
- [ ] Failed payment handling
- [  ] createTeams.handler No subscriptionId found in team metadata when moving team members via onboarding
- [ ] Immediate after payment, session doesn't have correct(new) upId set, so profile page for org doesn't load it seems
- [ ] What to do about "customer.subscription.deleted.team-plan'
- [ ] We need to reuse some of trpc/server/routers/viewer/organizations/create.handler.ts logic to start creating subdomains which isn't happening in _invoice.paid.org.ts at the moment.
- [ ] Verify if we have the logic to allow creating an organization with owner as the email for which the user doesn't have an account already.
- [ ] Make sure that we pass creationSource to createTeamsMutation.mutate
- [ ] Refreshing on onboarding once it is complete should redirect to configured URL.
- [ ] Organization slug conflict in onboarding
     - [ ] There could be many different users that are checking out organization with same slug. The first one to checkout should win.
     - [ ] We could have a separate endpoint to check if a slug is available.
- [ ] Test admin creation flow.
- [ ] We should flush onboarding store(useOnboardingStore) after the organizationOnboarding DB entry is created. Because persisted data in localStorage could accidentally get reused by admin for creating other organizations.
- [ ] checkout flow 
     - [ ] checkout button should be disabled till createWithPaymentIntent request completes.
     - [ ] checkout button should show a spinner when loading.
     - [ ] Errors from createWithPaymentIntent aren't being shown in UI.
     - [ ] "You already have a pending organization" error must not be shown if it is the same organization that is being created.
     - [ ] Handle payment failure. Maybe create a new page for failure like success page.
     - [ ] Even though the payment succeeds, the organization setup might fail. Possible failure reasons:
          - [ ] Organization slug conflict. Taken by some other organization. As soon as the onboarding is complete, the organization slug is reserved.
          - [ ] Domain setup - Vercel/Cloudflare domain creation might fail.
          - [ ] There could be soft errors like - certain users that couldn't be invited. Possibly some teams that couldn't be migrated
- [ ] Also we need to move the core logic from _invoice.paid.org.ts to somewhere else and just have import in there.
- [ ] Webhooks
     - [ ] Webhook could be retried by Stripe and thus we need to handle duplicates/existing records and be able to fix the data in DB.
- [ ] How does renewal of plan work? What if it fails? Do we read team.metadata.stripe related fields?
- Schema
     - OrganizationOnboarding schema should be unaware of the Payment app being used. We might need to move to another payment service as well.
- [ ] OrganizationOnboarding schema should be created through intentToCreateOrgHandler and rest of the flow should just update it. This could be important because we do a lot of validation in intentToCreateOrgHandler and without that we shouldn't allow organization to be created and thus no-pnboarding should happen.
     
TODO: Platform
- [ ] Platform organization creation flow has to be working in the same way

- Cleanup
     - [ ] We don't need team.metadata.requestedSlug for organizations as organization is created only after confirmation.
Bugs:
- [ ] When teams are added(in AddNewTeamsForm), they are persisted but aren't shown in the UI after refresh.
- [ ] createTeams.handler.ts doesn;t seem to validate the membership of the person with the teams being moved

Testing:
- Test a scenario where a team is moved with same slug as the organization's slug being moved to.
- [ ] Onboarding First Step(Organization)
     - [x] Error when user is already a part of an organization.
     - [x] Error when slug is taken by another organization.
- [ ] Onboarding First Step(Platform)


Followup Improvements:
 - Consider showing what each step in onboarding does.
 - Allow going back to previous steps.