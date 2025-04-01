- [ ] Separate migration for adding optional id to CalendarCache model, along with the manual migration of updating existing records with the id.
- [ ] Test the case where an email is there that can't be subscribed for freebusy updates(e.g. A user adds their personal calendar to their work calendar(having DWD), personal calendar can't be subscribed to though now and it would error when cron runs)


How to Test:
- Enable Calendar Cache and Delegation Credential feature for acme org
- Set Delegation Credential for acme org
- Enable atleast 1 calendar for conflict checking for one of the users(say owner1)
- Ensure GOOGLE_WEBHOOK_TOKEN is set in .env file
- Ensure GOOGLE_WEBHOOK_URL is set to ngrok url of webapp in .env file
- Hit cron endpoint `curl http://localhost:3000/api/calendar-cache/cron\?apiKey\={API_KEY}` that would cache the freebusy result for the selected calendars