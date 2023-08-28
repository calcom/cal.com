# Cal.com Email Assistant

The core logic is contained in [src/pages/api/receive.ts](https://github.com/RubricLab/cal-email-ai/blob/main/src/pages/api/receive.ts). This file contains some helpers:

- `parseFormData` to extract the text from incoming emails (which have a complex raw format)
- `getSlotsByUsername` to get availabilities for a Cal.com user
- `getEventTypesByUsername` to get a user's meeting types, like "15 min catch-up"
- `bookMeeting` to book the meeting by time and event type

## Getting Started

### Development

To install dependencies, `yarn i`. To run the app, `yarn dev`. To seed the DB in dev, run `npx prisma db seed`.

### Email Router

To expose the API, `ngrok http 3000` (or the relevant port number) in a new terminal. You may need to install [nGrok](https://ngrok.com/).

To forward incoming emails to the Node.js server, one option is to use [SendGrid's Inbound Parse Webhook](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook).

1. [Sign up for a free account](https://signup.sendgrid.com/)
2. Go to Settings > [Inbound Parse](https://app.sendgrid.com/settings/parse) > Add Host & URL.
3. For subdomain, use `ai.rubriclab.com` for now, where `ai` can be any subdomain but `rubriclab.com` will need to be verified via Vercel env vars.
4. Use the nGrok URL from above as the **Destination URL**.
5. Activate "POST the raw, full MIME message".
6. Send an email to `<anything>@ai.rubriclab.com`. You should see a ping on the nGrok listener and Node.js server.
7. Adjust the logic in [receive.ts](https://github.com/RubricLab/cal-email-ai/blob/main/src/pages/api/receive.ts), save, and send another email to test the behaviour.

Feel free to change literally any part of this architecture.
