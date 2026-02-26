import { describe, expect, it } from "vitest";

import { getAppOnboardingRedirectUrl } from "./getAppOnboardingRedirectUrl";

describe("getAppOnboardingRedirectUrl", () => {
  it("returns URI-encoded URL for the event-types step", () => {
    const result = getAppOnboardingRedirectUrl("google-calendar");
    // The inner URL is /apps/installation/event-types?slug=google-calendar
    const decoded = decodeURIComponent(result);
    expect(decoded).toBe("/apps/installation/event-types?slug=google-calendar");
  });

  it("includes teamId in the encoded URL when provided", () => {
    const result = getAppOnboardingRedirectUrl("zoom", 42);
    const decoded = decodeURIComponent(result);
    expect(decoded).toBe("/apps/installation/event-types?slug=zoom&teamId=42");
  });

  it("returns a properly encoded string (no slashes, no colons)", () => {
    const result = getAppOnboardingRedirectUrl("stripe");
    // encodeURIComponent encodes / as %2F
    expect(result).toContain("%2F");
    expect(result).not.toContain("/");
  });

  it("omits teamId when not provided", () => {
    const result = getAppOnboardingRedirectUrl("cal-video");
    const decoded = decodeURIComponent(result);
    expect(decoded).not.toContain("teamId");
  });
});
