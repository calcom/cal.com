- [ ] Separate migration for adding optional id to CalendarCache model, along with the manual migration of updating existing records with the id.
- [ ] Test the case where an email is there that can't be subscribed for freebusy updates(e.g. A user adds their personal calendar to their work calendar(having DWD), personal calendar can't be subscribed to though now and it would error when cron runs)
- [ ] Consider a scenario where a new user is invited to an organization with delegation credential enabled. Such a user doesn't have SelectedCalendar entry created. Even though availability will consider Google Calendar busytimes but we are unable to cache the slots for the user because of no record in SelectedCalendar for the user. We should, probably in the calendar-cache/cron, identify the team members of any organization having DelegationCredential enabled and we should start watching the calendars.
- [ ] What happens if SelectedCalendar has googleChannelId set through delegation credential and DelegationCredential is disabled ?
- [ ] Per user quota with Google Service Account
- [ ] Do we need to update corresponding timezone fns like getAvailabilityForTimezone and similar ones in CalendarManager
- [ ] Toggle Delegation Credential on/off and see that same SelectedCalendar is used for watching/unwatching

How to Test:
- Enable Calendar Cache and Delegation Credential feature for acme org
- Set Delegation Credential for acme org
- Enable atleast 1 calendar for conflict checking for one of the users(say owner1)
- Ensure GOOGLE_WEBHOOK_TOKEN is set in .env file
- Ensure GOOGLE_WEBHOOK_URL is set to ngrok url of webapp in .env file
- Hit cron endpoint `curl http://localhost:3000/api/calendar-cache/cron\?apiKey\={API_KEY}` that would cache the freebusy result for the selected calendars



Tests:
- Toggling Delegation on should create task delegationCredentialSelectedCalendars for the organization
- Toggling Delegation off should delete task delegationCredentialSelectedCalendars for the organization