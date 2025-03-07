## BUGS 
- Test Attribute Edit. It seems to be doing weird things with the ids.

## TODO
- [x] Sync from Okta to user could be in core namespace urn:ietf:params:scim:schemas:core:2.0:User and we might need to ask for the namespace to sync from.
- [x] Deleting a sub-option, should remove it from option-group?
- [x] Locked attribute are free to have its options completely reset by SCIM
- [x] Unlocked attribute shouldn't get updates from SCIM but in case they still do, we follow this strategy
    - If attribute from SCIM, doesn't exist on user, we allow it to be freely set on the user
    - If attribute from SCIM, exists on user 
        - [x] It is a single select or a non-enum attribute, we don't let it be overridden and completely ignore the SCIM update for that attribute
        - [x] It is a multi select, we remove the options that were created from SCIM and add the new options from SCIM. AttributeToUser.createdByDSyncId is set to SCIM directorySync id for those options. It allows both SCIM set and User set options to be assigned to the User.
    - [x] The options created by SCIM aren't deletable from Cal.com UI. User can only remove options created by Cal.com i.e. where AttributeToUser.createdByDSyncId is null.
- Restrict setting values 
    - [x] Allow setting any value for non enum attributes(i.e. non-dropdown attributes)
    - [x] Restrict setting values for enum attributes(i.e. dropdown attributes)
- AttributeAssignment within App
    - [x] For locked field, shouldn't be able to delete an assignment or add a new assignment.
    - [x] For unlocked field, should be able to delete the assignments owned by cal.com users only. Should be able to add new assignments for any user.
- [x] Support array update
- [x] Ensure the already existing assignment(with same value) isn't recreated. To ensure weights aren't reset.
    - [x] Locked attributes
    - [x] Unlocked attributes

## Test
- Okta to Cal.com
  1. Add a user with attribute
  2. Simulate a failure in adding the user
    - Failure could be in user creation or attribute assignment creation
  3. Remove the user and Re-add the user and see if it's correctly synced.
  - [x] Try removing a locked attribute assignment from a user.



## Documentation
Okta stuff
- Removing the assignment of a user from the app, doesn't remove the user from Cal.com
    - I observed that there were only GET request from Okta and no POST request.
    - As per https://boxyhq.com/docs/directory-sync/events Okta doesn't even send an event for deleting a user.