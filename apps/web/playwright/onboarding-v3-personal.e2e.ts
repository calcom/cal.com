import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Personal Flow", () => {
  const testPersonalOnboarding = (identityProvider: IdentityProvider) => {
    test(`Personal onboarding flow - ${identityProvider} user`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      await page.goto("/onboarding/getting-started");

      await test.step("Getting started - Select Personal plan", async () => {
        await page.waitForURL("/onboarding/getting-started");

        // Wait for the page to load and select Personal plan
        const personalPlan = page.getByTestId("onboarding-plan-personal");
        await expect(personalPlan).toBeVisible();
        await personalPlan.click();

        // Click Continue button
        await page.getByTestId("onboarding-continue").click();

        // Should navigate to personal settings
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("Personal Settings - Set name and timezone", async () => {
        // Check that we're on the settings page
        await expect(page.getByText("Welcome to Cal.com")).toBeVisible();

        // Fill in the name field
        await page.getByTestId("personal-settings-name").fill("Test User");

        // Select timezone (keeping default or can change)
        // The timezone select should already have a default value

        // Click Continue
        await page.getByTestId("personal-settings-continue").click();

        // Should navigate to profile page
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/profile/);
      });

      await test.step("Personal Profile - Set username and bio", async () => {
        // Check that we're on the profile page
        await expect(page.getByText("Complete your profile")).toBeVisible();

        // Fill in username
        const usernameInput = page.locator("input[name=username]");
        await usernameInput.fill("test-user-onboarding-v3");

        // Bio is optional, we can skip it for basic test

        // Click Continue
        await page.getByTestId("personal-profile-continue").click();

        // Should navigate to calendar page
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
      });

      await test.step("Personal Calendar - Skip calendar connection", async () => {
        // Check that we're on the calendar page
        await expect(page.getByText("Connect your calendar")).toBeVisible();

        // Click Skip button
        await page.getByTestId("personal-calendar-skip").click();

        // Should navigate to video page
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/video/);
      });

      await test.step("Personal Video - Complete onboarding", async () => {
        // Check that we're on the video page
        await expect(page.getByText("Connect video app")).toBeVisible();

        // Click Finish button
        await page.getByTestId("personal-video-finish").click();

        // Should navigate to event types page after completing onboarding
        await page.waitForURL("/event-types");

        // Verify user has completed onboarding
        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });
  };

  testPersonalOnboarding(IdentityProvider.GOOGLE);
  testPersonalOnboarding(IdentityProvider.CAL);
  testPersonalOnboarding(IdentityProvider.SAML);
});
