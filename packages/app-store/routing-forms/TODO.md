## TODO - Routing
- [x] Use teamMemberIds to calculate availabilithy as well in addition to doing it in handleNewBooking
- [x] Don't let the Routing Form with attributesQueryValue be picked
- [x] Use a subset of event assignees using teamMemberIds
- [x] Ensure that renaming an attribute option doesn't remove it from routing logic
- [x] Add support for multiselect_contains and multiselect_not_contains operators in attributes
- [x] Fix bug with Multiselect attribute
- [x] Connect Form Response to Booking
- [x] Test with non option based attributes and form field input
- [ ] Switching from Select to MultiSelect in attribute 
    - [x] It immediately makes the Routing logic to not work. Fix it.
    - [ ] It removes the selected option from Routing. Fix it.
    - [ ] Warnings are needed with recommendation to create new attribute instead in unsupported scenarios. We need to test for more such changes to Attribute types.
- [ ] When choosing 'Value of Field' option in RAQB, show a warning somewhere if all options of the Form field aren't present in the attribute option.
      - So, if Form Field is 'What is Comapny Size' with options Enterprise, Large, Medium, Small and Attribute for which Value of 'What is compnay size' has options Enterprise, Large, Medium. It would show a warning that 'Small' option is not present in the attribute.
- [ ] When logic can't be built(Short text maps to an attribute with given set of options but the short text value doesn't match any of the options), the team member matching route throws error but Test Preview still shows the previous value - It show should the error in there.

### Performance Tests and Improvements
- [ ] Test with ~1000 team members and ~100 attributes.
- [ ] getAttributes query optimization. It needs info from various tables(Attribute, AttributeOption, AttributeToUser, Membership)
- [ ] findTeamMembersMatchingAttributesQuery - Parallelize jsonLogic.apply across team members.

### Unit Tests
- [ ] findTeamMembersMatchingAttributesQuery
    - [x] Basic Tests
    - [ ] Performance Tests with say 1000 team members and 100 attributes to ensure no regression
- [ ] evaluateRAQB
    - [x] Basic Tests
    - [ ] More Detailed Tests
- [ ] jsonLogic
    - [x] Basic Tests
- [ ] getAttributes
    - [ ] Querying Logic Test
- [x] getRoutedUsers tests
- [ ] getAvailableSlots 
    - [ ] should use routedTeamMemberIds in availability query


### Documentation / Tooltip
- [ ] Document well that the option label in Routing Form Field and Attribute Option label must be same to connect them.
    - Due to the connection requirement b/w Attribute Option and Field Option, we use label(lowercased) to match attributes instead of attribute slug
- [ ] Fixed hosts of the event will be included through attribute routing as well. They aren't tested for attribute routing logic.

### V2.0
- [ ] Fallback for when no team member matches the criteria.
    - Fallback will be attributes query builder that would match a different set of users. Though the booking will use the team members assigned to the event type, it might be better to be able to identify such a scenario and use a different set of users. It also makes it easy to identify when the fallback scenario happens.
- [ ] cal.routedTeamMembersIds query param - Could possible become a big payload and possibly break the URL limit. We could work on a short-lived row in a table that would hold that info and we pass the id of that row only in query param. handleNewBooking can then retrieve the routedTeamMembersIds from that short-lived row and delete the entry after successfully creating a booking.
- [ ] Better ability to test with contact owner from Routing Form Preview itself(if possible). Right now, we need to test the entire booking flow to verify that.


## TODO - Attributes
- [ ] Attributes configuration
    1. through DB initially for POC
    2. through CSV upload
    3. through Salesforce Connect