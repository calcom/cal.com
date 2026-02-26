import { describe, expect, it } from "vitest";

import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

import { getAppOnboardingUrl } from "./getAppOnboardingUrl";

describe("getAppOnboardingUrl", () => {
  it("returns URL with slug and step", () => {
    const url = getAppOnboardingUrl({
      slug: "google-calendar",
      step: AppOnboardingSteps.ACCOUNTS_STEP,
    });
    expect(url).toBe("/apps/installation/accounts?slug=google-calendar");
  });

  it("includes teamId when provided", () => {
    const url = getAppOnboardingUrl({
      slug: "zoom",
      step: AppOnboardingSteps.EVENT_TYPES_STEP,
      teamId: 42,
    });
    expect(url).toBe("/apps/installation/event-types?slug=zoom&teamId=42");
  });

  it("omits teamId when not provided", () => {
    const url = getAppOnboardingUrl({
      slug: "stripe",
      step: AppOnboardingSteps.CONFIGURE_STEP,
    });
    expect(url).not.toContain("teamId");
    expect(url).toBe("/apps/installation/configure?slug=stripe");
  });

  it("omits teamId when it is 0 (falsy)", () => {
    const url = getAppOnboardingUrl({
      slug: "stripe",
      step: AppOnboardingSteps.CONFIGURE_STEP,
      teamId: 0,
    });
    // teamId 0 is falsy, so it should be omitted
    expect(url).not.toContain("teamId");
  });

  it("works with all step types", () => {
    for (const step of Object.values(AppOnboardingSteps)) {
      const url = getAppOnboardingUrl({ slug: "test-app", step });
      expect(url).toContain(`/apps/installation/${step}`);
      expect(url).toContain("slug=test-app");
    }
  });

  it("encodes special characters in slug", () => {
    const url = getAppOnboardingUrl({
      slug: "my app",
      step: AppOnboardingSteps.ACCOUNTS_STEP,
    });
    // querystring.stringify encodes spaces as %20
    expect(url).toContain("slug=my%20app");
  });
});
