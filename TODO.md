## Version 1.0
### Important
  - [x] Where should we show the user the client ID to enable domain wide delegation?
    - [x] It must be shown to the organization owner/admin only
    - [x] There could be multiple checkboxes per domain to enable domain wide delegation for a domain
  - [x] Which domain to allow
    - Any domain can be added by a user
  - [x] Support multiple domains in DomainWideDelegation schema for an organization
    - [x] Use the domain as well to identify if the domain wide delegation is enabled
  - [ ] Confirmation for DwD deletion
  - [ ] Don't allow disabled platform to be selected in the UI for creation.
    - We can restrict updating as well with that platform(i.e. show it in the list but not let it save)
    - But we shouldn't stop showing it in the UI, otherwise it might get changed to some other platform due to Select's nature.
  - [ ] If the user doesn't exist in Google Workspace, and the user has connected personal account, should we correctly use the personal account?
  - [ ] Fix installed status not showing correctly on apps/index.tsx. Install button isn't disabled there.
  
### Follow-up release
- [ ] Just after creating Domain-wide delegation, there should be a check to ensure that the clientID has been added to the Workspace Platform and then only show it as enabled.


### To discuss
  - [ ] 1. When the calendar is connect the first calendar isn't enabled to check for double bookings. Should we toggle that?

### Security Testing
- [ ] Because a single credential controls all the emails calendars, can someone not authorized trick us into giving access to some other organization's calendars?
  - [ ] We need to really make sure that service account key is NEVER exposed
    - [x] We don't even let the admin user see the added service account key.
    - [ ] We intend to implement Workload Identity Federation in the future.
    
### Testing 
- [ ] Inviting a new user. 
  - Verified that Google Calendar is shown pre-installed. 
  - How about Google Meet?
- [ ] Troubleshooter. Seems to be not working

### Documentation
- After enabling domain-wide delegation, the credential is shown pre-installed and the connection can't be removed(or the app can't be uninstalled by user)
- Steps
  - App admin will first create a Workspace Platform and then organization owner/admin can enable domain-wide delegation for a domain
  - As soon as domain-wide delegation is created, it would start taking preference over the personal credentials of the organization members and it would be used for that. 

Version-2.0
- Workload Identity Federation to ensure that the service account key is never stored in DB.



