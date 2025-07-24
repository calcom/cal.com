import { describe, it, expect, beforeEach } from "vitest";

// The mock is automatically applied when importing from @calcom/lib/constants
import { IS_PRODUCTION, WEBSITE_URL, IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { constantsScenarios } from "./constants";

describe("Constants Mock Example", () => {
  beforeEach(() => {
    // The mock automatically resets to initial values before each test
  });

  it("should have default mock values", () => {
    expect(IS_PRODUCTION).toBe(false);
    expect(WEBSITE_URL).toBe("https://cal.com");
    expect(IS_TEAM_BILLING_ENABLED).toBe(false);
  });

  it("should allow enabling team billing", () => {
    constantsScenarios.enableTeamBilling();

    expect(IS_TEAM_BILLING_ENABLED).toBe(true);
  });

  it("should allow setting website URL", () => {
    constantsScenarios.setWebsiteUrl("https://example.com");

    expect(WEBSITE_URL).toBe("https://example.com");
  });

  it("should allow enabling production mode", () => {
    constantsScenarios.enableProduction();

    expect(IS_PRODUCTION).toBe(true);
  });

  it("should allow setting multiple values at once", () => {
    constantsScenarios.set({
      IS_PRODUCTION: true,
      WEBSITE_URL: "https://test.com",
      IS_TEAM_BILLING_ENABLED: true,
    });

    expect(IS_PRODUCTION).toBe(true);
    expect(WEBSITE_URL).toBe("https://test.com");
    expect(IS_TEAM_BILLING_ENABLED).toBe(true);
  });

  it("should reset to initial values after each test", () => {
    // This test should have the default values again
    expect(IS_PRODUCTION).toBe(false);
    expect(WEBSITE_URL).toBe("https://cal.com");
    expect(IS_TEAM_BILLING_ENABLED).toBe(false);
  });
});
