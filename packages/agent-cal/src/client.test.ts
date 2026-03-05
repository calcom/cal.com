import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCal } from "./client.js";

const MOCK_BEARER = "cal_xxx_or_token";

describe("AgentCal", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when neither apiKey nor accessToken is provided", () => {
    expect(() => new AgentCal({})).toThrow("AgentCal requires either apiKey or accessToken");
  });

  it("accepts apiKey", () => {
    const client = new AgentCal({ apiKey: MOCK_BEARER });
    expect(client).toBeDefined();
  });

  it("accepts accessToken", () => {
    const client = new AgentCal({ accessToken: MOCK_BEARER });
    expect(client).toBeDefined();
  });

  it("getCalendars calls GET /v2/calendars with Bearer", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            status: "success",
            data: { connectedCalendars: [], destinationCalendar: null },
          })
        ),
    });
    const client = new AgentCal({ apiKey: MOCK_BEARER, fetch: fetchMock });
    await client.getCalendars();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/v2/calendars");
    expect(fetchMock.mock.calls[0][1]?.headers?.Authorization).toBe(`Bearer ${MOCK_BEARER}`);
  });

  it("getConnections calls GET /v2/calendars/connections", async () => {
    const mockConnections = [
      { connectionId: "123", type: "google", email: "user@gmail.com" },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "success", data: { connections: mockConnections } })
        ),
    });
    const client = new AgentCal({ apiKey: MOCK_BEARER, fetch: fetchMock });
    const connections = await client.getConnections();
    expect(connections).toEqual(mockConnections);
    expect(fetchMock.mock.calls[0][0]).toContain("/v2/calendars/connections");
  });

  it("listEvents builds query params and returns data", async () => {
    const mockEvents = [
      {
        id: "evt1",
        title: "Meeting",
        start: { time: "2026-03-10T09:00:00", timeZone: "America/New_York" },
        end: { time: "2026-03-10T09:30:00", timeZone: "America/New_York" },
        source: "google",
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "success", data: mockEvents })
        ),
    });
    const client = new AgentCal({ apiKey: MOCK_BEARER, fetch: fetchMock });
    const events = await client.listEvents("123", {
      from: "2026-03-01",
      to: "2026-03-31",
      timeZone: "America/New_York",
    });
    expect(events).toEqual(mockEvents);
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain("/v2/calendars/connections/123/events");
    expect(url).toContain("from=2026-03-01");
    expect(url).toContain("to=2026-03-31");
    expect(url).toContain("timeZone=America%2FNew_York");
  });

  it("createEvent sends POST body and returns event", async () => {
    const mockEvent = {
      id: "new-id",
      title: "Standup",
      start: { time: "2026-03-10T09:00:00", timeZone: "America/New_York" },
      end: { time: "2026-03-10T09:30:00", timeZone: "America/New_York" },
      source: "google",
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "success", data: mockEvent })
        ),
    });
    const client = new AgentCal({ apiKey: MOCK_BEARER, fetch: fetchMock });
    const event = await client.createEvent("123", {
      title: "Standup",
      start: { time: "2026-03-10T09:00:00", timeZone: "America/New_York" },
      end: { time: "2026-03-10T09:30:00", timeZone: "America/New_York" },
    });
    expect(event).toEqual(mockEvent);
    expect(fetchMock.mock.calls[0][0]).toContain("/v2/calendars/connections/123/events");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[0][1]?.body).toContain("Standup");
  });

  it("deleteEvent calls DELETE and returns void", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve("") });
    const client = new AgentCal({ apiKey: MOCK_BEARER, fetch: fetchMock });
    await client.deleteEvent("123", "event-id-123");
    expect(fetchMock.mock.calls[0][0]).toContain("/v2/calendars/connections/123/events/event-id-123");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("getFreeBusy builds query and returns busy slots", async () => {
    const mockBusy = [
      { start: "2026-03-10T09:00:00Z", end: "2026-03-10T10:00:00Z" },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "success", data: mockBusy })
        ),
    });
    const client = new AgentCal({ apiKey: MOCK_BEARER, fetch: fetchMock });
    const busy = await client.getFreeBusy("123", {
      from: "2026-03-10",
      to: "2026-03-10",
      timeZone: "America/New_York",
    });
    expect(busy).toEqual(mockBusy);
    expect(fetchMock.mock.calls[0][0]).toContain("/v2/calendars/connections/123/freebusy");
  });

  it("uses custom baseUrl when provided", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "success", data: { connectedCalendars: [] } })
        ),
    });
    const client = new AgentCal({
      apiKey: MOCK_BEARER,
      baseUrl: "https://custom.cal.com",
      fetch: fetchMock,
    });
    await client.getCalendars();
    expect(fetchMock.mock.calls[0][0]).toBe("https://custom.cal.com/v2/calendars");
  });
});
