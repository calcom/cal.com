import { describe, expect, it } from "vitest";

import { getProtonIcsUrls, normalizeProtonIcsUrl } from "./getProtonIcsUrls";

const PROTON_URL =
  "https://calendar.proton.me/api/calendar/v1/url/abc123/calendar.ics?CacheKey=k&PassphraseKey=p";

describe("normalizeProtonIcsUrl", () => {
  it("accepts a Proton Calendar share link", () => {
    expect(normalizeProtonIcsUrl(PROTON_URL)).toBe(PROTON_URL);
  });

  it("accepts the apex proton.me host", () => {
    expect(normalizeProtonIcsUrl("https://proton.me/calendar.ics")).toBe("https://proton.me/calendar.ics");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeProtonIcsUrl(`  ${PROTON_URL}  `)).toBe(PROTON_URL);
  });

  it("upgrades a webcal:// subscription link to https", () => {
    expect(normalizeProtonIcsUrl("webcal://calendar.proton.me/feed.ics")).toBe(
      "https://calendar.proton.me/feed.ics"
    );
  });

  it("compares the host case-insensitively", () => {
    expect(normalizeProtonIcsUrl("https://Calendar.Proton.ME/feed.ics")).toBe(
      "https://calendar.proton.me/feed.ics"
    );
  });

  it("rejects an empty string", () => {
    expect(() => normalizeProtonIcsUrl("   ")).toThrow(/must not be empty/);
  });

  it("rejects a non-string value", () => {
    expect(() => normalizeProtonIcsUrl(123 as unknown)).toThrow(/must be a string/);
  });

  it("rejects a malformed URL", () => {
    expect(() => normalizeProtonIcsUrl("not a url")).toThrow(/Invalid Proton Calendar URL/);
  });

  it("rejects non-https schemes", () => {
    expect(() => normalizeProtonIcsUrl("http://calendar.proton.me/feed.ics")).toThrow(/must use https/);
  });

  it("rejects a non-Proton host", () => {
    expect(() => normalizeProtonIcsUrl("https://evil.com/calendar.ics")).toThrow(/Not a Proton Calendar URL/);
  });

  it("rejects a look-alike host that only ends with proton.me without a dot boundary", () => {
    expect(() => normalizeProtonIcsUrl("https://evilproton.me/calendar.ics")).toThrow(
      /Not a Proton Calendar URL/
    );
  });

  it("rejects a host that embeds proton.me as a subdomain of an attacker domain", () => {
    expect(() => normalizeProtonIcsUrl("https://proton.me.evil.com/calendar.ics")).toThrow(
      /Not a Proton Calendar URL/
    );
  });
});

describe("getProtonIcsUrls", () => {
  it("normalizes a list of valid URLs", () => {
    expect(getProtonIcsUrls([PROTON_URL, "webcal://proton.me/other.ics"])).toEqual([
      PROTON_URL,
      "https://proton.me/other.ics",
    ]);
  });

  it("removes duplicate URLs while preserving order", () => {
    expect(getProtonIcsUrls([PROTON_URL, `  ${PROTON_URL}  `])).toEqual([PROTON_URL]);
  });

  it("throws when the payload is not an array", () => {
    expect(() => getProtonIcsUrls(PROTON_URL)).toThrow(/must be provided as an array/);
  });

  it("throws when the list is empty", () => {
    expect(() => getProtonIcsUrls([])).toThrow(/At least one Proton Calendar URL is required/);
  });

  it("throws if any URL in the list is invalid", () => {
    expect(() => getProtonIcsUrls([PROTON_URL, "https://evil.com/x.ics"])).toThrow(
      /Not a Proton Calendar URL/
    );
  });
});
