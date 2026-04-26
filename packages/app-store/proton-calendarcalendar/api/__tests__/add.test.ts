import { describe, expect, it } from "vitest";
import { isValidProtonUrl } from "../add";

describe("isValidProtonUrl", () => {
  it("accepts valid calendar.proton.me HTTPS URL", () => {
    expect(
      isValidProtonUrl("https://calendar.proton.me/api/calendar/v1/url/abc123/calendar.ics?CacheKey=secret")
    ).toBe(true);
  });

  it("accepts valid calendar.protonmail.com HTTPS URL", () => {
    expect(isValidProtonUrl("https://calendar.protonmail.com/api/calendar/v1/url/x/calendar.ics")).toBe(true);
  });

  it("rejects HTTP (non-HTTPS) URLs", () => {
    expect(isValidProtonUrl("http://calendar.proton.me/api/calendar/v1/url/x/calendar.ics")).toBe(false);
  });

  it("rejects non-Proton hostnames", () => {
    expect(isValidProtonUrl("https://evil.com/api/calendar/v1/url/x/calendar.ics")).toBe(false);
  });

  it("rejects subdomain spoofing (e.g. fake-calendar.proton.me)", () => {
    expect(isValidProtonUrl("https://fake-calendar.proton.me/something")).toBe(false);
  });

  it("rejects endsWith bypass (e.g. notcalendar.proton.me)", () => {
    expect(isValidProtonUrl("https://notcalendar.proton.me/ics")).toBe(false);
  });

  it("rejects hostname suffix attacks (e.g. evil.calendar.proton.me)", () => {
    expect(isValidProtonUrl("https://evil.calendar.proton.me/something")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isValidProtonUrl("not-a-url")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidProtonUrl("")).toBe(false);
  });

  it("rejects javascript: protocol", () => {
    expect(isValidProtonUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects file: protocol", () => {
    expect(isValidProtonUrl("file:///etc/passwd")).toBe(false);
  });

  it("accepts URLs with credentials in userinfo when hostname is valid", () => {
    expect(isValidProtonUrl("https://user:pass@calendar.proton.me/ics")).toBe(true);
  });
});
