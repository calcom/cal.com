# @calcom/agent-cal

TypeScript SDK for the [Cal.com Unified Calendar API](https://cal.com/docs/api-reference/v2/cal-unified-calendars). Use it to list, create, update, and delete calendar events **without** managing OAuth or API keys for Google, Outlook, or Apple yourself — Cal.com’s verified credentials are used on your behalf.

Useful for AI agents, scripts, and backends that need calendar access with minimal setup.

## Install

```bash
npm i @calcom/agent-cal
# or
yarn add @calcom/agent-cal
# or
pnpm add @calcom/agent-cal
```

**Requirements:** Node.js 18+ (uses native `fetch`).

## Quick start

Provide either a Cal.com **API key** (e.g. `cal_...`) or an **access token** from your OAuth flow:

```ts
import { AgentCal } from "@calcom/agent-cal";

const cal = new AgentCal({
  accessToken: process.env.CAL_ACCESS_TOKEN,
  // or: apiKey: process.env.CAL_API_KEY,
});

// List calendar connections (use connectionId in all event calls)
const connections = await cal.getConnections();
// e.g. [{ connectionId: "123", type: "google", email: "you@gmail.com" }, ...]
const connId = connections[0].connectionId;

// List events
const events = await cal.listEvents(connId, {
  from: "2026-03-01",
  to: "2026-03-31",
  timeZone: "America/New_York",
});

// Create an event
const event = await cal.createEvent(connId, {
  title: "Team standup",
  start: { time: "2026-03-10T09:00:00", timeZone: "America/New_York" },
  end: { time: "2026-03-10T09:30:00", timeZone: "America/New_York" },
  attendees: [{ email: "alice@example.com" }],
});

// Update an event
await cal.updateEvent(connId, event.id, { title: "Updated standup" });

// Delete an event
await cal.deleteEvent(connId, event.id);

// Free/busy
const busy = await cal.getFreeBusy(connId, {
  from: "2026-03-10",
  to: "2026-03-10",
  timeZone: "America/New_York",
});
```

## Authentication

- **API key**  
  Create one in [Cal.com Dashboard → API Keys](https://app.cal.com/settings/api-keys). Pass as `apiKey: "cal_..."` or set `CAL_API_KEY`.

- **Access token**  
  From your OAuth flow (e.g. CLI auth or custom integration). Pass as `accessToken` or set `CAL_ACCESS_TOKEN`.

The client sends `Authorization: Bearer <token>` on every request. If you use an access token, you are responsible for refreshing it when it expires.

## API reference

### Constructor

```ts
new AgentCal(options: AgentCalOptions)
```

| Option         | Type     | Description                                      |
|----------------|----------|--------------------------------------------------|
| `apiKey`       | `string` | Cal.com API key (e.g. `cal_...`)                |
| `accessToken`  | `string` | OAuth access token                              |
| `baseUrl`      | `string` | API base URL (default: `https://api.cal.com`)   |
| `fetch`        | `function` | Custom fetch (e.g. for tests)                 |
| `maxRetries`   | `number` | Retries for 429/5xx (default: `2`)              |

One of `apiKey` or `accessToken` is required.

### Methods

| Method | Description |
|--------|-------------|
| `getConnections()` | List calendar connections; returns `{ connectionId, type, email }[]`. Use `connectionId` in all event methods. |
| `getCalendars()` | List connected calendars (legacy full shape) |
| `listEvents(connectionId, input)` | List events in a date range (`from`, `to`, optional `timeZone`, `calendarId`) |
| `createEvent(connectionId, input)` | Create an event (`title`, `start`, `end`, optional `description`, `attendees`) |
| `getEvent(connectionId, eventId)` | Get a single event by provider event ID |
| `updateEvent(connectionId, eventId, input)` | Update an event (partial updates supported) |
| `deleteEvent(connectionId, eventId)` | Delete/cancel an event |
| `getFreeBusy(connectionId, input)` | Get busy slots (`from`, `to`, optional `timeZone`) |

**connectionId** comes from `getConnections()`. Full CRUD and free/busy are currently supported for **Google** connections; other providers are planned.

## Environment variables

- `CAL_API_KEY` — API key (used by `getOptionsFromEnv()`)
- `CAL_ACCESS_TOKEN` — Access token
- `CAL_API_BASE_URL` — Override API base URL

## Types

All request/response shapes are exported from the package:

```ts
import type {
  UnifiedCalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  ListCalendarEventsInput,
  GetFreeBusyInput,
  BusyTimeSlot,
  GetCalendarsResponse,
} from "@calcom/agent-cal";
```

## Errors

Failed requests throw `AgentCalHttpError` with `status` and optional `body`:

```ts
import { AgentCal, AgentCalHttpError } from "@calcom/agent-cal";

try {
  await cal.listEvents(connId, { from: "2026-03-01", to: "2026-03-31" });
} catch (e) {
  if (e instanceof AgentCalHttpError) {
    console.error(e.status, e.body);
  }
}
```

## CLI

After installing globally (`npm i -g @calcom/agent-cal`) or via `npx`, you can use:

```bash
npx @calcom/agent-cal auth          # Authenticate and save credentials to ~/.agentcal/
npx @calcom/agent-cal connect       # Open Cal.com to connect a calendar (Google, Outlook, Apple)
npx @calcom/agent-cal status        # Show connected calendars
npx @calcom/agent-cal events list   # List upcoming events (default: first connection, next 7 days)
npx @calcom/agent-cal token-info    # Show token status (masked) and expiry
npx @calcom/agent-cal disconnect    # Remove stored credentials
npx @calcom/agent-cal mcp           # Run MCP server (stdio) with calendar tools
```

**Auth flow:** You must have a Cal.com OAuth client with redirect URI `http://localhost:9876/callback`. Create one at [Cal.com Developer OAuth](https://app.cal.com/settings/developer/oauth) (or your instance, e.g. `http://localhost:3000/settings/developer/oauth` for local). Then run:

```bash
npx @calcom/agent-cal auth --client-id YOUR_CLIENT_ID
# or
AGENT_CAL_CLIENT_ID=YOUR_CLIENT_ID npx @calcom/agent-cal auth
```

The CLI opens the OAuth page, listens on port 9876 for the callback, exchanges the code (PKCE), and writes `~/.agentcal/credentials.json`.

## MCP server

Run the Model Context Protocol server over stdio for use with MCP clients (e.g. Cursor, Claude):

```json
{
  "mcpServers": {
    "agent-cal": {
      "command": "npx",
      "args": ["-y", "@calcom/agent-cal", "mcp"],
      "env": {}
    }
  }
}
```

Credentials are loaded from `~/.agentcal/credentials.json` (run `npx @calcom/agent-cal auth` first). Exposed tools: `get_calendars`, `list_events`, `create_event`, `get_event`, `update_event`, `delete_event`, `get_free_busy`.

## License

MIT
