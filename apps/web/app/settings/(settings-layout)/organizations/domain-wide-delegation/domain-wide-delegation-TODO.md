## Version 1.0
### Release Plan
  - Read the document(domain-wide-delegation.md) and acknowledge it.
  - Deploy
    1. Follow "Setting up Domain-Wide Delegation for Google Calendar API" in domain-wide-delegation.md to create Service Account and create a workspace.
    2. Merge PR and then deploy.
 - Enabling for i.cal.com
    - 1. Enable DWD for i.cal.com first and then test there
    - 2. Wait for 1-2 days and keep monitoring the errors in Sentry and Axiom.
 - Enable for a big customer
    - 1. Wait for a week and keep monitoring the errors in Sentry and Axiom.
- Followup with sorting the credentials with DWD credentials first
- Monitor the errors in Sentry and Axiom.

### Important
  - Bugs
    - [ ] Duplicate Calendar Events in Google Calendar when choosing non-primary calendar as destination. No idea why this is happening.
    - [x] Duplicate Calendar connections in 'apps/installed' if a user already had connected calendar and DWD is enabled.
    - Manual Testing
      - [ ] Location Change of a booking  to Google Meet(from Cal Video)
      - [ ] RR Team Event
        - Reroute
        - Reassign
      - [ ] Calendar Cache
    - [x] If a user has connected a calendar, and then DWD is enabled.
      - Tested various scenarios for it
    - [x] Inviting a new user. 
      - Verified that Google Calendar is shown pre-installed. 
      - How about Google Meet(which depends on Google Calendar) - Correctly shows up as installed.
  - TODO:
    - [x] Troubleshooter
    - [x] Google CalendarService unit tests to verify that if DWD credential is provided it uses impersonation to access API otherwise it uses regular user credential API.
    - [x] setDestinationCalendar.handler.ts tests to verify that when DWD is enabled it still correctly sets the destination calendar. 
    - [x] getConnectedDestinationCalendars tests.
  - [x] Creating DWD shouldn't immediately enable it. Enabling has separate check to confirm if it is actually configured in google workspace
  - [x] Added check to avoid adding same domain for a workspace platform in another organization if it is already enabled in some other organization
  - [x] Don't show dwd in menu for non-org-admin users - It errors with something_went_wrong right now
  - [x] Don't allow disabled platform to be selected in the UI for creation.
    - We have disabled coming the disabled platform to be coming into the list that effectively disables edit of existing dwd and creation of new dwd for that platform.
  - [x] Where should we show the user the client ID to enable domain wide delegation?
    - [x] It must be shown to the organization owner/admin only
    - [x] There could be multiple checkboxes per domain to enable domain wide delegation for a domain
  - [x] Which domain to allow
    - Any domain can be added by a user
  - [x] Support multiple domains in DomainWideDelegation schema for an organization
    - [x] Use the domain as well to identify if the domain wide delegation is enabled
  - [x] Before enabling Domain-wide delegation, there should be a check to ensure that the clientID has been added to the Workspace Platform
  - [x] We should allow setting default conferencing app during onboarding

### Follow-up release
  - [ ] Confirmation for DwD deletion and disabling
  - [ ] If DWD is enabled and the org member doesn't exist in Google Workspace, and the user has connected personal account, should we correctly use the personal account?

### Security
  - [x] We don't let any one user see the added service account key from UI.
  - [ ] We intend to implement Workload Identity Federation in the future.
  
### Documentation
- After enabling domain-wide delegation, the credential is shown pre-installed and the connection can't be removed(or the app can't be uninstalled by user)
- Steps
  - App admin will first create a Workspace Platform and then organization owner/admin can enable domain-wide delegation for a domain
  - As soon as domain-wide delegation is created, it would start taking preference over the personal credentials of the organization members and it would be used for that. 

Version-2.0
- Workload Identity Federation to ensure that the service account key is never stored in DB.



