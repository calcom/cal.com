import { describe, expect, it } from "vitest";

import { isValidProtonCalendarUrl, normalizeProtonCalendarUrl } from "../validateProtonCalendarUrl";

describe("Proton Calendar URL validation", () => {
  it("accepts Proton Calendar HTTPS and webcal ICS subscription URLs", () => {
    expect(
      isValidProtonCalendarUrl("https://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")
    ).toBe(true);
    expect(
      isValidProtonCalendarUrl("webcal://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")
    ).toBe(true);
  });

  it("normalizes webcal URLs to HTTPS before storage", () => {
    expect(normalizeProtonCalendarUrl("webcal://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")).toBe(
      "https://calendar.proton.me/api/calendar/v1/url/token/calendar.ics"
    );
  });

  it("rejects non-HTTPS or malformed URLs", () => {
    expect(isValidProtonCalendarUrl("http://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")).toBe(
      false
    );
    expect(isValidProtonCalendarUrl("ftp://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")).toBe(
      false
    );
    expect(isValidProtonCalendarUrl("not a url")).toBe(false);
  });

  it("rejects non-Proton and internal HTTPS hosts", () => {
    expect(isValidProtonCalendarUrl("https://example.com/calendar.ics")).toBe(false);
    expect(isValidProtonCalendarUrl("https://192.168.0.1/calendar.ics")).toBe(false);
    expect(isValidProtonCalendarUrl("https://localhost/calendar.ics")).toBe(false);
    expect(isValidProtonCalendarUrl("https://account.proton.me/calendar.ics")).toBe(false);
  });

  it("rejects Proton URLs outside the calendar ICS endpoint", () => {
    expect(isValidProtonCalendarUrl("https://calendar.proton.me/calendar.ics")).toBe(false);
    expect(isValidProtonCalendarUrl("https://calendar.proton.me/api/calendar/v1/url/token")).toBe(false);
  });
});
