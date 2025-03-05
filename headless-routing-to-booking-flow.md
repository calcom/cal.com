1. Navigate to Headless Router - acme.cal.com/router?formId={FORM_ID}&field1=value1&field2=value2
   1. Validate the fields types and ensure required fields are present
   2. Based on the fields values, choose a route.
   3. Records a response for the form.
   4. If the route is an eventTypeRedirect, 
      - Identify the teamMembers matching that route's attribute routing rules.
      - Redirect to the booking page of the eventType, along with the `routedTeamMemberIds` query param that has the matching teamMembers' ids.
   5. Notify through emails if they are members to be notified and fire Routing form related webhooks.
2. User reaches the booking page.
3. Sees the available slots for the matching teamMembers only
4. Selects a slot.
    - Selecting a slot temporarily blocks the slot for other bookers.
5. Confirm the booking
    1. Ensures that the members are available for the slot depending on various rules like type of event(RR, Collective) and other configurations in the eventType and selected calendars
    2. Send Emails and fire webhooks

