## TODO - Routing
- [ ] Switching from Select to MultiSelect in attribute 
    - [ ] It immediately makes the Routing logic to not work. Fix it.
    - [ ] It removes the selected option from Routing. Fix it.
    - [ ] Warnings are needed with recommendation to create new attribute instead in unsupported scenarios. We need to test for more such changes to Attribute types.
- [ ] Test Seated events as routing targets.
- Improvements
    - [ ] When choosing 'Value of Field' option in RAQB, show a warning somewhere if all options of the Form field aren't present in the attribute option.
        - So, if Form Field is 'What is Company Size' with options Enterprise, Large, Medium, Small and Attribute for which Value of 'What is compnay size' has options Enterprise, Large, Medium. It would show a warning that 'Small' option is not present in the attribute.
    - [ ] When logic can't be built(Short text maps to an attribute with given set of options but the short text value doesn't match any of the options), the team member matching route throws error but Test Preview still shows the previous value - It show should the error in there.
    - [ ] When routing to a team that doesn't have the team members assigned that are chosen, we are unable to select those users. FIX it by ignoring the assigned members(except the fixed hosts) and just using the attributes matched team members.
- [ ] Fetch bookings on window focus but not when rerouting dialog is open. As soon as it is closed, we need to refetch again.
- [ ] Seated Events
    - [ ] Disable routing for seated events. Disable only during creation.
- [ ] When rescheduling to a new event, the booking title remains same which will most probably not match the event-type title. This is the behaviour of reschedule. Should we use the new event-type title? 
- [ ] What params should we forward to the booking page that we show after rerouting
- [ ] On completing the rerouting just show the new Routing status
- [ ] We need to disallow changing the email identifier field as during a reschedule user isn't allowed to change their email currently. Allowing to change that email response would mean that we support changing email during reschedule which might be disabled for some reasons unknown yet.
- [ ] What if there are changes to Form before rerouting but after initial routing.
- [ ] Not able to prefill rescheduleReason due to a bug in useInitialFormValues hook
- [ ] It is becoming a requirement to have BookingAttempt record to allow to store reroutingFormResponses as well as teamMemberIds in it. Other query params could also be stored later on when needed. It is important to reduce the payload of the query params due to routedTeamMemberIds and reroutingFormResponses


### Performance Tests and Improvements
- [ ] Test with ~1000 team members and ~100 attributes.
- [ ] getAttributes query optimization. It needs info from various tables(Attribute, AttributeOption, AttributeToUser, Membership)
- [ ] findTeamMembersMatchingAttributesQuery - Parallelize jsonLogic.apply across team members.

### Unit Tests
- [ ] evaluateRAQB
    - [x] Basic Tests
    - [ ] More Detailed Tests
- [ ] getAttributes
    - [ ] Querying Logic Test
- [ ] getAvailableSlots 
    - [ ] should use routedTeamMemberIds in availability query


### Documentation / Tooltip
- [ ] Document well that the option label in Routing Form Field and Attribute Option label must be same to connect them.
    - Due to the connection requirement b/w Attribute Option and Field Option, we use label(lowercased) to match attributes instead of attribute slug
- [ ] Fixed hosts of the event will be included through attribute routing as well. They aren't tested for attribute routing logic.
- [ ] When re-routed, the booking page doesn't allow rescheduling/cancellation to avoid any possible issues. We can open it up later.
- [ ] Booking with seats not supported yet. Need to figure out which seats should be re-routed or if re-routing makes sense for it even?
- [ ] Hashed link re-routing doesn't make sense with. With Routing you route to an event from form and it doesn't involve hashed link even if it is enabled
- [ ] User needs to ensure for now that the team event they redirect to has 'Assign all and future members of the team' checked.

### V2.0
- [ ] Fallback for when no team member matches the criteria.
    - [x] Fallback will be attributes query builder that would match a different set of users. Though the booking will use the team members assigned to the event type, it might be better to be able to identify such a scenario and use a different set of users. It also makes it easy to identify when the fallback scenario happens.
    - [ ] Mark if fallback was used by the router for a response. 
- [ ] cal.routedTeamMembersIds query param - Could possible become a big payload and possibly break the URL limit. We could work on a short-lived row in a table that would hold that info and we pass the id of that row only in query param. handleNewBooking can then retrieve the routedTeamMembersIds from that short-lived row and delete the entry after successfully creating a booking.
- [ ] Better ability to test with contact owner from Routing Form Preview itself(if possible). Right now, we need to test the entire booking flow to verify that.