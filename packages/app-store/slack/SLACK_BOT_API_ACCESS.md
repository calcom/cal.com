# Slack Bot API Access (Cal.com tools)

This document describes how to add **API access** to the Cal.com Slack experience: an AI-powered bot in Slack that can list bookings, find slots, and create bookings using Cal.com API v2.

Notifications (booking events posted to Slack) are handled by the **Slack app** in this repo and the **webhook bridge** at `apps/web/app/api/integrations/slack/webhook/route.ts`. API access (conversational bot) is implemented separately, as below.

## Option A: Deploy ai-sdk-slackbot with Cal.com tools

Use [vercel-labs/ai-sdk-slackbot](https://github.com/vercel-labs/ai-sdk-slackbot) as the base. Install with `npm i chat` or `yarn add chat` (Vercel Chat SDK) as needed for your setup.

1. Clone or fork the repo and deploy (e.g. to Vercel).
2. Add Cal.com tools in the bot’s tools module (e.g. `lib/ai.ts`), following the AI SDK tool pattern.
3. Store Cal.com API key per Slack user or workspace (e.g. “Connect Cal.com” flow; store in DB or env).

### Cal.com API v2 base

- **Base URL**: `https://api.cal.com/v2`
- **Auth**: `Authorization: Bearer <CAL_API_KEY>`
- **Version header**: `cal-api-version: 2024-08-13` (or latest from [Cal.com API docs](https://cal.com/docs/api-reference/v2)).

### Suggested tools

**1. Get upcoming bookings**

- **Tool name**: e.g. `getUpcomingBookings`
- **API**: `GET /v2/bookings?status=upcoming&take=10`
- **Purpose**: Answer questions like “What are my upcoming meetings?”

**2. Get available slots**

- **Tool name**: e.g. `getAvailableSlots`
- **API**: `GET /v2/slots?eventTypeId=...&startTime=...&endTime=...` (or `eventTypeSlug` and `usernameList` as needed)
- **Purpose**: “Find 30-minute slots next week”, “When is John free?”

**3. Create booking**

- **Tool name**: e.g. `createBooking`
- **API**: `POST /v2/bookings` with body `{ eventTypeId, start, attendee: { name, email, timeZone }, location?, metadata? }`
- **Purpose**: “Book a 30min with john@example.com next Tuesday at 2pm”

### Example tool (getUpcomingBookings)

```ts
// Pseudocode for AI SDK tool
{
  getUpcomingBookings: tool({
    description: "List the user's upcoming Cal.com bookings",
    parameters: z.object({}),
    execute: async () => {
      const res = await fetch("https://api.cal.com/v2/bookings?status=upcoming&take=10", {
        headers: {
          Authorization: `Bearer ${getCalApiKeyForSlackUser()}`,
          "cal-api-version": "2024-08-13",
        },
      });
      const data = await res.json();
      return JSON.stringify(data.data ?? data);
    },
  }),
}
```

Resolve `getCalApiKeyForSlackUser()` from your store (e.g. Slack user ID → Cal.com API key).

### Environment variables

- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` (Slack app)
- `OPENAI_API_KEY` (or other LLM provider)
- Per-workspace or per-user Cal.com API key (from your DB or config)

## Option B: In-repo Slack Events handler (future)

You can add an Slack Events API route inside Cal.com (e.g. `apps/web/app/api/slack/events/route.ts`) that:

1. Verifies the Slack request signature.
2. Handles `url_verification` challenge.
3. For `message` / `app_mention` events, runs the AI SDK with the Cal.com tools above.

That would require adding the AI SDK and Slack adapter (e.g. `ai` + Slack-specific packages) to `apps/web` and implementing the event handler and tool execution. The same tool definitions and API v2 usage above apply.

## References

- [Cal.com API v2](https://cal.com/docs/api-reference/v2)
- [Cal.com API skill (bookings, slots, webhooks)](.cursor/skills/calcom-api/)
- [ai-sdk-slackbot](https://github.com/vercel-labs/ai-sdk-slackbot)
- [Building a Slack AI Chatbot with the AI SDK](https://sdk.vercel.ai/docs/guides/slackbot)
