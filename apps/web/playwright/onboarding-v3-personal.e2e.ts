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
        const personalPlan = page.getByTestId("onboarding-plan-personal");
        await expect(personalPlan).toBeVisible();
        await personalPlan.click();
        await page.getByTestId("onboarding-continue").click();
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("Personal Settings - Set name and timezone", async () => {
        await expect(page.getByText("Welcome to Cal.com")).toBeVisible();
        await page.getByTestId("personal-settings-name").fill("Test User");
        await page.getByTestId("personal-settings-continue").click();
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/profile/);
      });

      await test.step("Personal Profile - Set username and bio", async () => {
        await expect(page.getByText("Complete your profile")).toBeVisible();
        const usernameInput = page.locator("input[name=username]");
        await usernameInput.fill("test-user-onboarding-v3");
        await page.getByTestId("personal-profile-continue").click();
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
      });

      await test.step("Personal Calendar - Skip calendar connection", async () => {
        await expect(page.getByText("Connect your calendar")).toBeVisible();
        await page.getByTestId("personal-calendar-skip").click();
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/video/);
      });

      await test.step("Personal Video - Complete onboarding", async () => {
        await expect(page.getByText("Connect video app")).toBeVisible();
        await page.getByTestId("personal-video-finish").click();
        await page.waitForURL("/event-types");
        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });
  };

  testPersonalOnboarding(IdentityProvider.CAL);
});
