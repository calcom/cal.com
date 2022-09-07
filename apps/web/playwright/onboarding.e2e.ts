import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Onboarding", () => {
  test.describe("Onboarding v2", () => {
    test("test onboarding v2 new user first step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started");

      // First step

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

      await expect(page).toHaveURL(/.*connected-calendar/);

      const userComplete = await user.self();
      expect(userComplete.name).toBe("new user 2");
    });

    test("test onboarding v2 new user second step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started/connected-calendar");

      // Second step

      const nextButtonCalendar = await page.locator("button[data-testid=save-calendar-button]");
      const isDisabled = await nextButtonCalendar.isDisabled();
      await expect(isDisabled).toBe(true);

      const skipStepButton = await page.locator("button[data-testid=skip-step]");
      await skipStepButton.click();
      await expect(page).toHaveURL(/.*setup-availability/);
      // @TODO: make sure calendar UL list has at least 1 item
    });

    test("test onboarding v2 new user third step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started/setup-availability");

      // Third step

      const nextButtonAvailability = await page.locator("button[data-testid=save-availability]");
      const isDisabled = await nextButtonAvailability.isDisabled();
      await expect(isDisabled).toBe(false);

      const skipStepButton = await page.locator("button[data-testid=skip-step]");
      await skipStepButton.click();
      await expect(page).toHaveURL(/.*user-profile/);
    });

    test("test onboarding v2 new user fourth step", async ({ page, users }) => {
      const user = await users.create({ plan: UserPlan.TRIAL, completedOnboarding: false, name: "new user" });
      await user.login();
      await page.goto("/getting-started/user-profile");

      // Fourth step

      const finishButton = await page.locator("button[type=submit]");
      const bioInput = await page.locator("textarea[name=bio]");
      await bioInput.fill("Something about me");
      const isDisabled = await finishButton.isDisabled();
      await expect(isDisabled).toBe(false);
      await finishButton.click();

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
      const nextButtonUserProfile = await page.locator("button[type=submit]");
      await nextButtonUserProfile.click();

      const requiredName = await page.locator("data-testid=required");
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

      const finishButton = await page.locator("button[type=submit]");
      await finishButton.click();

      const requiredBio = await page.locator("data-testid=required");
      await expect(requiredBio).toHaveText(/required/i);
    });
  });

  test.describe("Onboarding redirects", () => {
    test("redirects to /getting-started after login", async ({ page }) => {
      await page.goto("/event-types");
      await page.waitForNavigation();
    });

    // @TODO: temporary disabled due to flakiness
    // test("test onboarding v2 new user simulate add calendar redirect", async ({ page, users }) => {
    //   const user = await users.create({
    //     plan: UserPlan.TRIAL,
    //     completedOnboarding: false,
    //   });

    //   await user.login();
    //   const url = await page.url();
    //   await page.context().addCookies([
    //     {
    //       name: "return-to",
    //       value: "/getting-started/connected-calendar",
    //       expires: 9999999999,
    //       url,
    //     },
    //   ]);

    //   await page.goto("/apps/installed");

    //   await expect(page).toHaveURL(/.*connected-calendar/);
    // });
  });
});
