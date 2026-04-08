import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
  WEBSITE_URL: "https://cal.com",
  CONSOLE_URL: "https://console.cal.com",
  EMBED_LIB_URL: "https://app.cal.com/embed/lib/embed.js",
}));

import { getSafeReturnTo } from "./getSafeReturnTo";

describe("getSafeReturnTo", () => {
  it("returns fallback when returnTo is null", () => {
    expect(getSafeReturnTo(null, "/dashboard")).toBe("/dashboard");
  });

  it("returns fallback when returnTo is undefined", () => {
    expect(getSafeReturnTo(undefined, "/dashboard")).toBe("/dashboard");
  });

  it("returns fallback when returnTo is empty string", () => {
    expect(getSafeReturnTo("", "/dashboard")).toBe("/dashboard");
  });

  it("returns the path for a valid relative URL", () => {
    const result = getSafeReturnTo("/settings/profile", "/dashboard");
    expect(result).toBe("/settings/profile");
  });

  it("preserves query parameters in the returned path", () => {
    const result = getSafeReturnTo("/settings?tab=general", "/dashboard");
    expect(result).toBe("/settings?tab=general");
  });

  it("preserves hash in the returned path", () => {
    const result = getSafeReturnTo("/settings#section", "/dashboard");
    expect(result).toBe("/settings#section");
  });

  it("returns fallback for external URLs (different origin)", () => {
    const result = getSafeReturnTo("https://evil.com/phishing", "/dashboard");
    // getSafeRedirectUrl should redirect external URLs to WEBAPP_URL
    expect(result).toBe("/");
  });

  it("handles absolute URLs from the same origin", () => {
    const result = getSafeReturnTo("https://app.cal.com/bookings", "/dashboard");
    expect(result).toBe("/bookings");
  });
});
