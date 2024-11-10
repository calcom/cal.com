/* eslint-disable playwright/no-skipped-test */
import { expect } from "@playwright/test";
import { fillStripeTestCheckout } from "playwright/lib/testUtils";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "serial" });

test.afterEach(({ users }) => users.deleteAll());
test.describe("Onboarding v3", () => {
  test.describe("Google Sign Up", () => {
    test.beforeEach(async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider: "GOOGLE",
      });
      await user.apiLogin();
      await page.goto("/getting-started");
      // Verify landing on first screen
      await page.waitForURL("/getting-started");
    });
    test.afterEach(({ users }) => users.deleteAll());

    test("Personal Account Flow (1-step)", async ({ page }) => {
      // Click "For personal use" button
      await page.getByText("For personal use").click();

      // Click "Continue" button
      await page.locator("button[type=submit]").click();

      // Should redirect directly to event-types
      await page.waitForURL("/event-types");
    });

    test("Team Account Flow (4-step) @test", async ({ page }) => {
      test.skip(!IS_TEAM_BILLING_ENABLED, "Skipping paying for Teams as Stripe is disabled");

      await page.getByText("With my team").click();
      await page.locator("button[type=submit]").click();
      await page.waitForURL("/settings/teams/new");

      await page.locator('input[name="name"]').fill("NewTeamName");
      await page.click("[type=submit]");

      await fillStripeTestCheckout(page);
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members.*$/i);
      await page.locator("[data-testid=publish-button]").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/event-type*$/i);
      await page.locator("[data-testid=handle-later-button]").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/profile$/i);
    });
  });
});
