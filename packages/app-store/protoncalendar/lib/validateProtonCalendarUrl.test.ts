import { describe, expect, it } from "vitest";
import { isProtonCalendarUrl } from "./validateProtonCalendarUrl";

describe("isProtonCalendarUrl", () => {
  it("accepts Proton Calendar share links", () => {
    expect(isProtonCalendarUrl("https://calendar.proton.me/api/calendar/v1/url/example/calendar.ics")).toBe(
      true
    );
  });

  it("rejects non-https links", () => {
    expect(isProtonCalendarUrl("http://calendar.proton.me/api/calendar/v1/url/example/calendar.ics")).toBe(
      false
    );
  });

  it("rejects lookalike hostnames", () => {
    expect(isProtonCalendarUrl("https://calendar.proton.me.example.com/calendar.ics")).toBe(false);
  });

  it("rejects other calendar hosts", () => {
    expect(isProtonCalendarUrl("https://example.com/calendar.ics")).toBe(false);
  });
});
