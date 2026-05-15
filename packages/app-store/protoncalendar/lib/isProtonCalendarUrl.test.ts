import { describe, expect, it } from "vitest";
import { isProtonCalendarUrl } from "./isProtonCalendarUrl";

describe("isProtonCalendarUrl", () => {
  it("accepts Proton Calendar share links", () => {
    expect(isProtonCalendarUrl("https://calendar.proton.me/api/calendar/v1/share/example")).toBe(true);
    expect(isProtonCalendarUrl("https://calendar.protonmail.com/calendar/example.ics")).toBe(true);
    expect(isProtonCalendarUrl("https://calendar.pm.me/calendar/example.ics")).toBe(true);
  });

  it("rejects non-HTTPS and lookalike hosts", () => {
    expect(isProtonCalendarUrl("http://calendar.proton.me/calendar/example.ics")).toBe(false);
    expect(isProtonCalendarUrl("https://calendar.proton.me.evil.test/calendar/example.ics")).toBe(false);
    expect(isProtonCalendarUrl("https://example.com/calendar/example.ics")).toBe(false);
    expect(isProtonCalendarUrl("not a url")).toBe(false);
  });
});
