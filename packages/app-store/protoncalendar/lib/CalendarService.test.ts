import process from "node:process";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import type { CredentialPayload } from "@calcom/types/Credential";
import { afterEach, describe, expect, it, vi } from "vitest";

const ENCRYPTION_KEY = "12345678901234567890123456789012";
const PROTON_URL = "https://calendar.proton.me/api/calendar/v1/url/example/calendar.ics?CacheKey=secret";

function buildCredential(): CredentialPayload {
  return {
    id: 1,
    type: "proton_calendar",
    key: symmetricEncrypt(JSON.stringify({ urls: [PROTON_URL] }), ENCRYPTION_KEY),
    user: { email: "test@example.com" },
    encryptedKey: null,
  } as unknown as CredentialPayload;
}

describe("ProtonCalendarService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.CALENDSO_ENCRYPTION_KEY;
  });

  it("ignores cancelled recurring instances", async () => {
    process.env.CALENDSO_ENCRYPTION_KEY = ENCRYPTION_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:series-1
DTSTART:20260512T100000Z
DTEND:20260512T110000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Daily standup
END:VEVENT
BEGIN:VEVENT
UID:series-1
RECURRENCE-ID:20260513T100000Z
DTSTART:20260513T100000Z
DTEND:20260513T110000Z
STATUS:CANCELLED
SUMMARY:Daily standup
END:VEVENT
END:VCALENDAR`);
      })
    );

    const { default: BuildCalendarService } = await import("./CalendarService");
    const service = BuildCalendarService(buildCredential());
    const availability = await service.getAvailability({
      dateFrom: "2026-05-12T00:00:00.000Z",
      dateTo: "2026-05-15T00:00:00.000Z",
      selectedCalendars: [],
      mode: "slots",
    });

    expect(availability.map((event) => event.start)).toEqual([
      "2026-05-12T10:00:00.000Z",
      "2026-05-14T10:00:00.000Z",
    ]);
  });

  it("includes recurring instances that start at the requested window boundary", async () => {
    process.env.CALENDSO_ENCRYPTION_KEY = ENCRYPTION_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:boundary-series
DTSTART:20260512T100000Z
DTEND:20260512T110000Z
RRULE:FREQ=DAILY;COUNT=2
SUMMARY:Boundary standup
END:VEVENT
END:VCALENDAR`);
      })
    );

    const { default: BuildCalendarService } = await import("./CalendarService");
    const service = BuildCalendarService(buildCredential());
    const availability = await service.getAvailability({
      dateFrom: "2026-05-12T10:00:00.000Z",
      dateTo: "2026-05-13T10:00:00.000Z",
      selectedCalendars: [],
      mode: "slots",
    });

    expect(availability.map((event) => event.start)).toEqual(["2026-05-12T10:00:00.000Z"]);
  });

  it("does not follow redirects to non-Proton hosts", async () => {
    process.env.CALENDSO_ENCRYPTION_KEY = ENCRYPTION_KEY;
    const fetchMock = vi.fn(async () => {
      return new Response("", {
        status: 302,
        headers: {
          location: "https://example.com/calendar.ics",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { default: BuildCalendarService } = await import("./CalendarService");
    const service = BuildCalendarService(buildCredential());

    await expect(service.listCalendars()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
