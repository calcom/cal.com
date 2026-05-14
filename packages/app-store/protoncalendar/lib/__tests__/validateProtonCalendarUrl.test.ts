import { describe, expect, it } from "vitest";
import { isValidProtonCalendarUrl, normalizeProtonCalendarUrl } from "../validateProtonCalendarUrl";

describe("Proton Calendar URL validation", () => {
  it("accepts HTTPS and webcal subscription URLs", () => {
    expect(
      isValidProtonCalendarUrl("https://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")
    ).toBe(true);
    expect(
      isValidProtonCalendarUrl("webcal://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")
    ).toBe(true);
  });

  it("normalizes webcal URLs to HTTPS before storage", () => {
    expect(
      normalizeProtonCalendarUrl("webcal://calendar.proton.me/api/calendar/v1/url/token/calendar.ics")
    ).toBe("https://calendar.proton.me/api/calendar/v1/url/token/calendar.ics");
  });

  it("rejects non-HTTPS URLs", () => {
    expect(isValidProtonCalendarUrl("http://calendar.proton.me/calendar.ics")).toBe(false);
    expect(isValidProtonCalendarUrl("ftp://calendar.proton.me/calendar.ics")).toBe(false);
    expect(isValidProtonCalendarUrl("not a url")).toBe(false);
  });
});
