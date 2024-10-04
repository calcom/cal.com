## Specs

1. Allow creating a Round Robin event without team members assigned(already possible). But one that can accept team members dynamically.
    1. Approach-1: Prototype could be to accept memberIds as query params and that would be posted to handleNewBooking
    2. Approach-2: We can improve upon it later to create a group of members on the fly in DB and then post that membersGroupId in the Round Robin event booking
        1. We could later clean that group in DB after the booking is done. Booking would anyway have all the members that are part of it(AFAIK)
2. Routing Logic would now have 'Pick the Team Members' section along with 'Send to Booking Page' section
    1. 'Pick the Team members' would allow configuring logic with Attributes to identify the team(on which the Routing Form is created) members matching the logic. Let's call it 'Routed Team Members'
        1. It would also allow "Attribute 'Company Size'" to equal "User Field 'Company Size'"
            Problem: How do we estabilish a connection b/w Attribute option and Field Option. Attribute generates slug automatically which should be allowed to be changed and can match identifier of field option
    2. 'Send to Booking Page' would allow choosing a Team Event Type that would use the 'Routed Team Members' as the team members for the event type.
3. Attributes configuration
    1. through DB initially for POC
    2. through CSV upload
    3. through Salesforce Connect
    4. Anything else.

## Use Cases
1. 


TODO:
- [x] Use teamMemberIds to calculate availabilithy as well in addition to doing it in handleNewBooking
- [x] Don't let the Routing Form with attributesQueryValue be picked
- [x] Use a subset of event assignees using teamMemberIds
- [x] Ensure that renaming an attribute option doesn't remove it from routing logic
- [ ] Document well that the option label in Routing Form Field and Attribute Option name must be same to connect them.
- [ ] Test with non option based attributes and form field input
- [ ] Switching from Select to MultiSelect in attribute removes the selected option from Routing.
    - Warnings are needed with recommendation to create new attribute instead
- [x] Add support for multiselect_contains and multiselect_not_contains operators in attributes
- [x] Fix bug with Multiselect attribute
- [ ] Unit tests for findTeamMembersMatchingAttributesQuery
    - [ ] Should test performance as well
- [ ] Test with hundreds of team members and 100s of attributes. Like 2000 is what our biggest customer has.

V2.0
- Fallback for when no team member matches the criteria.
    - Fallback will be attributes query builder that would match a different set of users. Though the booking will use the team members assigned to the event type, it might be better to be able to identify such a scenario and use a different set of users. It also makes it easy to identify when the fallback scenario happens.