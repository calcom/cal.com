import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Personal Flow", () => {
  const testPersonalOnboarding = (identityProvider: IdentityProvider) => {
    test(`Personal Onboarding Flow - ${identityProvider} user`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();

      await test.step("Navigate to getting-started and select personal plan", async () => {
        await page.goto("/onboarding/getting-started");
        await page.waitForURL("/onboarding/getting-started");

        await expect(page.locator('text="Personal"')).toBeVisible();
        await page.locator('input[value="personal"]').click();
        await page.locator('button:has-text("Continue")').click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("step 1 - Personal Settings - Validation", async () => {
        await page.locator('button[type="submit"]').click();
        await expect(page.locator("form").locator("text=/name.*required/i")).toBeVisible();
      });

      await test.step("step 1 - Personal Settings - Happy Path", async () => {
        await page.locator('input[name="name"]').fill("John Doe");
        await expect(page.locator('input[name="username"]')).toBeVisible();
        await page.locator('textarea[name="bio"]').fill("Software engineer and scheduling enthusiast");
        await expect(page.locator('text="Profile picture"')).toBeVisible();
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);

        const userComplete = await user.self();
        expect(userComplete.name).toBe("John Doe");
      });

      await test.step("step 2 - Calendar Integration - Test Skip", async () => {
        await expect(page.locator('text="Connect your calendar"')).toBeVisible();
        await expect(page.locator('button:has-text("Back")')).toBeVisible();

        const skipButton = page.locator('button:has-text("Skip")').first();
        await expect(skipButton).toBeVisible();
        await expect(skipButton).toBeEnabled();
        await skipButton.click();

        await page.waitForURL(/.*\/event-types/);

        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });

    test(`Personal Onboarding Flow - ${identityProvider} user - Back Navigation`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();

      await test.step("Navigate to settings step", async () => {
        await page.goto("/onboarding/getting-started");
        await page.waitForURL("/onboarding/getting-started");

        await page.locator('input[value="personal"]').click();
        await page.locator('button:has-text("Continue")').click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("Back navigation from settings to getting-started", async () => {
        await page.locator('button:has-text("Back")').click();
        await expect(page).toHaveURL(/.*\/onboarding\/getting-started/);
        await expect(page.locator('input[value="personal"]')).toBeChecked();
      });

      await test.step("Navigate forward and test back from calendar step", async () => {
        await page.locator('button:has-text("Continue")').click();
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);

        await page.locator('input[name="name"]').fill("Jane Smith");
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);

        await page.locator('button:has-text("Back")').click();
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
        await expect(page.locator('input[name="name"]')).toHaveValue("Jane Smith");
      });
    });

    test(`Personal Onboarding Flow - ${identityProvider} user - Calendar Continue`, async ({
      page,
      users,
    }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();

      await test.step("Navigate through to calendar step", async () => {
        await page.goto("/onboarding/getting-started");
        await page.waitForURL("/onboarding/getting-started");

        await page.locator('input[value="personal"]').click();
        await page.locator('button:has-text("Continue")').click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);

        await page.locator('input[name="name"]').fill("Test User");
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
      });

      await test.step("Continue without calendar integration", async () => {
        await expect(page.locator('text="Connect your calendar"')).toBeVisible();

        const continueButton = page.locator('button:has-text("Continue")').last();
        await expect(continueButton).toBeVisible();
        await expect(continueButton).toBeEnabled();
        await continueButton.click();

        await page.waitForURL(/.*\/event-types/);

        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });

    test(`Personal Onboarding Flow - ${identityProvider} user - Direct URL Access`, async ({
      page,
      users,
    }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();

      await test.step("Direct access to settings page", async () => {
        await page.goto("/onboarding/personal/settings");
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);

        await expect(page.locator('input[name="name"]')).toBeVisible();

        await page.locator('input[name="name"]').fill("Direct Access User");
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
      });

      await test.step("Direct access to calendar page", async () => {
        await page.goto("/onboarding/personal/calendar");
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);

        await expect(page.locator('text="Connect your calendar"')).toBeVisible();

        const skipButton = page.locator('button:has-text("Skip")').first();
        await skipButton.click();

        await page.waitForURL(/.*\/event-types/);

        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });
  };

  testPersonalOnboarding(IdentityProvider.CAL);
  testPersonalOnboarding(IdentityProvider.GOOGLE);
  testPersonalOnboarding(IdentityProvider.SAML);
});
