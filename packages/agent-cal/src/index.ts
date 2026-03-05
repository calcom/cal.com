/**
 * @calcom/agent-cal — TypeScript SDK for Cal.com Unified Calendar API.
 *
 * Use with API key or access token to list, create, update, and delete
 * calendar events without managing OAuth yourself.
 *
 * @example
 * ```ts
 * import { AgentCal } from "@calcom/agent-cal";
 *
 * const cal = new AgentCal({
 *   accessToken: process.env.CAL_ACCESS_TOKEN,
 *   // or apiKey: process.env.CAL_API_KEY,
 * });
 *
 * const connections = await cal.getConnections();
 * const connId = connections[0].connectionId;
 * const events = await cal.listEvents(connId, {
 *   from: "2026-03-01",
 *   to: "2026-03-31",
 *   timeZone: "America/New_York",
 * });
 *
 * const event = await cal.createEvent(connId, {
 *   title: "Team standup",
 *   start: { time: "2026-03-10T09:00:00", timeZone: "America/New_York" },
 *   end: { time: "2026-03-10T09:30:00", timeZone: "America/New_York" },
 *   attendees: [{ email: "alice@example.com" }],
 * });
 * ```
 */

export { AgentCal } from "./client.js";
export {
  exchangeCodeForTokens,
  generateCodeChallenge,
  generateCodeVerifier,
  getOptionsFromEnv,
  loadStoredCredentials,
  needsRefresh,
} from "./auth.js";
export { AgentCalHttpError, request } from "./utils/http.js";
export {
  ensureCredentialsDir,
  getCredentialsDir,
  getCredentialsPath,
  isTokenExpired,
  writeCredentials,
} from "./utils/token.js";
export type { StoredCredentials } from "./utils/token.js";
export {
  getConnectedSources,
  getDefaultGoogleCalendarId,
} from "./calendars/connections.js";
export type { ConnectedCalendar, GetCalendarsResponse } from "./calendars/connections.js";

export type {
  AgentCalOptions,
  BusyTimeSlot,
  CalendarConnection,
  CalendarEventAttendee,
  CalendarEventHost,
  CalendarEventLocation,
  CalendarEventStatus,
  CalendarSource,
  CreateCalendarEventInput,
  DateTimeWithZone,
  GetFreeBusyInput,
  GetFreeBusyResponse,
  ListCalendarEventsInput,
  ListConnectionsResponse,
  UpdateCalendarEventInput,
  UnifiedCalendarEvent,
} from "./types.js";
