## Version 1.0
### Important
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

### To discuss
  - 
    
### Security Testing
- [ ] Because a single credential controls all the emails calendars, can someone not authorized trick us into giving access to some other organization's calendars?
  - [ ] We need to really make sure that service account key is NEVER exposed
    - [x] We don't even let the admin user see the added service account key.
    - [ ] We intend to implement Workload Identity Federation in the future.
    
### Testing 
- [ ] Inviting a new user. 
  - Verified that Google Calendar is shown pre-installed. 
  - How about Google Meet?
- [x] Troubleshooter

### Documentation
- After enabling domain-wide delegation, the credential is shown pre-installed and the connection can't be removed(or the app can't be uninstalled by user)
- Steps
  - App admin will first create a Workspace Platform and then organization owner/admin can enable domain-wide delegation for a domain
  - As soon as domain-wide delegation is created, it would start taking preference over the personal credentials of the organization members and it would be used for that. 

Version-2.0
- Workload Identity Federation to ensure that the service account key is never stored in DB.



