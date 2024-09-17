- Important
  - [x] Where should we show the user the client ID to enable domain wide delegation?
    - [x] It must be shown to the organization owner/admin only
    - [x] There could be multiple checkboxes per domain to enable domain wide delegation for a domain
  - [x] Which domain to allow
    - Any domain can be added by a user
  - [x] Support multiple domains in DomainWideDelegation schema for an organization
    - [x] Use the domain as well to identify if the domain wide delegation is enabled
  - [ ] Automatically mark a DomainWideDelegation to have status as "error" if there is an error during event creation using it. Note that we might not have a fallback to go to but we could inform the admin about it.
  
Not Important for first release
  - [ ] Show the correct error in banner and on installed apps page(calendar_error translation key) if there is an error listing calendars
    - [ ] If the error is due to the email not being part of the google workspace, we could highlight this error[Low Priority]
  - [ ] When a user installs the app via DWD, user should be redirected to the installation page that would show errors if any

To discuss
  - [ ] 1. When the calendar is connect the first calendar isn't enabled to check for double bookings. Should we toggle that?
  - [ ] 2. If admin disables DWD , what happens to already installed credentials? There will be no fallback for most users as they simply didn't have their own connection. In such a case, first of all we should make it really difficult to disable DWD, with clear confirmations from user.
  Then, we should show an actionable error instead of calendar_error that would ask them
  - Bigger Question is how do we ensure that users don't have to install the app. The connection should be preinstalled
    - DB Update Approach - This is costly performance wise as there could be indexed on credentials and that makes inserts slow
      - When DWD is enabled, we create the credentials for all the members of the organization(in batches)
      - When DWD is disabled, we delete the credentials for all the members of the organization(in batches)
      - When an org member is added, we add the credentials for them
      - When an org member is removed, we delete the credentials for them
    - In Memory Approach
      - We refactor credential getting logic to be done through a service which would have all the logic to get the credentials. There we can have a way to return a dummy credential if DWD is enabled.


Security Testing
- [ ] Because a single credential controls all the emails calendars, can someone not authorized trick us into giving access to some other organization's calendars?
  - [ ] We need to really make sure that service account key is NEVER exposed
    - [x] We don't even let the admin user see the added service account key.
    - [ ] We intend to implement Workload Identity Federation in the future.
    