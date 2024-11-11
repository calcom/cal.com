/* eslint-disable playwright/no-skipped-test */
import { expect } from "@playwright/test";
import { fillStripeTestCheckout } from "playwright/lib/testUtils";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "serial" });

test.afterEach(({ users }) => users.deleteAll());
test.describe("Onboarding v3", () => {
  test.afterEach(({ users }) => users.deleteAll());
  test.describe("Google Sign Up", () => {
    test("Personal Account Flow (1-step)", async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider: "GOOGLE",
      });
      await user.apiLogin();
      await page.goto("/getting-started");

      // Verify landing on first screen
      await page.waitForURL("/getting-started");

      // Click "For personal use" button
      await page.getByText("For personal use").click();

      // Click "Continue" button
      await page.locator("button[type=submit]").click();

      // Should redirect directly to event-types
      await page.waitForURL("/event-types");

      expect(await user.confirmCompletedOnboarding()).toEqual(true);
    });

    test("Team Account Flow (4-step)", async ({ page, users }) => {
      test.skip(!IS_TEAM_BILLING_ENABLED, "Skipping paying for Teams as Stripe is disabled");

      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider: "GOOGLE",
      });
      await user.apiLogin();
      await page.goto("/getting-started");

      // Verify landing on first screen
      await page.waitForURL("/getting-started");

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
      expect(await user.confirmCompletedOnboarding()).toEqual(true);
    });
  });

  test.describe("Email Sign Up", () => {
    test("Personal Account Flow (3-step)", async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider: "CAL",
      });
      await user.apiLogin();
      await page.goto("/getting-started");

      // Verify landing on first screen
      await page.waitForURL("/getting-started");

      // Click "For personal use" button
      await page.getByText("For personal use").click();

      // Click "Continue" button
      await page.locator("button[type=submit]").click();

      // Connected Calendar screen
      await expect(page).toHaveURL(/.*connected-calendar/);
      expect(await page.locator("button[data-testid=save-calendar-button]").isDisabled()).toBe(true);
      // tests skip button, we don't want to test entire flow.
      await page.locator("button[data-testid=skip-step]").click();

      // Connected Video screen
      await expect(page).toHaveURL(/.*connected-video/);
      expect(await page.locator("button[data-testid=save-video-button]").isDisabled()).toBe(false);
      await page.locator("button[data-testid=save-video-button]").click();

      await page.waitForURL("/event-types");

      expect(await user.confirmCompletedOnboarding()).toEqual(true);
    });

    test("Team Account Flow (4-step)", async ({ page, users }) => {
      test.skip(!IS_TEAM_BILLING_ENABLED, "Skipping paying for Teams as Stripe is disabled");

      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider: "CAL",
      });
      await user.apiLogin();
      await page.goto("/getting-started");

      // Verify landing on first screen
      await page.waitForURL("/getting-started");

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
      expect(await user.confirmCompletedOnboarding()).toEqual(true);
    });
  });
});
