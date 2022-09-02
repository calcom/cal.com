import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Onboarding", () => {
  test("redirects to /getting-started after login", async ({ page }) => {
    await page.goto("/event-types");
    await page.waitForNavigation();
  });

  test.describe("Onboarding v2", () => {
    test("test onboarding v2 new user first step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started");

      // First step
      await page.waitForSelector("text=Welcome to Cal.com");
      const usernameInput = await page.locator("input[name=username]");
      await usernameInput.fill("new user onboarding");

      const nameInput = await page.locator("input[name=name]");
      await nameInput.fill("new user 2");

      const timezoneSelect = await page.locator("input[role=combobox]");
      await timezoneSelect.click();
      const timezoneOption = await page.locator("text=Eastern Time");
      await timezoneOption.click();

      const nextButtonUserProfile = await page.locator("button[type=submit]");
      await nextButtonUserProfile.click();

      await page.waitForSelector("text=Connect your calendar");
      await expect(page).toHaveURL(/.*connected-calendar/);

      const userComplete = await user.self();
      expect(userComplete.name).toBe("new user 2");
    });

    test("test onboarding v2 new user second step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started/connected-calendar");

      // Second step
      await page.waitForSelector("text=Connect your calendar");
      const nextButtonCalendar = await page.locator("button[data-testid=save-calendar-button]");
      const isDisabled = await nextButtonCalendar.isDisabled();
      await expect(isDisabled).toBe(true);

      const skipStepButton = await page.locator("a[data-testid=skip-step]");
      await skipStepButton.click();
      await expect(page).toHaveURL(/.*setup-availability/);
      // @TODO: make sure calendar UL list has at least 1 item
    });

    test("test onboarding v2 new user third step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started/setup-availability");

      // Third step
      await page.waitForSelector("text=Set your availability");
      const nextButtonAvailability = await page.locator("button[data-testid=save-availability]");
      const isDisabled = await nextButtonAvailability.isDisabled();
      await expect(isDisabled).toBe(false);

      const skipStepButton = await page.locator("a[data-testid=skip-step]");
      await skipStepButton.click();
      await expect(page).toHaveURL(/.*user-profile/);
    });

    test("test onboarding v2 new user fourth step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started/user-profile");

      // Fourth step
      await page.waitForSelector("text=Nearly there!");
      const finishButton = await page.locator("button[type=submit]");
      const bioInput = await page.locator("input[name=bio]");
      await bioInput.fill("Something about me");
      const isDisabled = await finishButton.isDisabled();
      await expect(isDisabled).toBe(false);
      await finishButton.click();
      await page.waitForNavigation();

      await expect(page).toHaveURL(/.*event-types/);

      const userComplete = await user.self();
      expect(userComplete.bio).toBe("Something about me");
    });
  });

  test.describe("Onboarding v2 required field test", () => {
    test("test onboarding v2 new user first step required fields", async ({ page, users }) => {
      const user = await users.create({
        plan: UserPlan.TRIAL,
        completedOnboarding: false,
        name: null,
        username: null,
      });

      await user.login();
      await page.goto("/getting-started");

      // First step
      await page.waitForSelector("text=Welcome to Cal.com");
      const nextButtonUserProfile = await page.locator("button[type=submit]");
      await nextButtonUserProfile.click();

      const requiredName = await page.locator("text=Required");
      await expect(requiredName).toHaveText(/required/i);
    });

    test("test onboarding v2 new user fourth step required fields", async ({ page, users }) => {
      const user = await users.create({
        plan: UserPlan.TRIAL,
        completedOnboarding: false,
      });

      await user.login();
      await page.goto("/getting-started/user-profile");

      // Fourth step
      await page.waitForSelector("text=Nearly there!");
      const finishButton = await page.locator("button[type=submit]");
      await finishButton.click();

      const requiredBio = await page.locator("text=Required");
      await expect(requiredBio).toHaveText(/required/i);
    });
  });
});
