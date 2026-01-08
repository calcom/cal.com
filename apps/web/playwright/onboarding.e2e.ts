import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding", () => {
  const testOnboarding = (identityProvider: IdentityProvider) => {
    test(`Onboarding Flow - ${identityProvider} user`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      await page.goto("/getting-started");
      // tests whether the user makes it to /getting-started
      // after login with completedOnboarding false
      await page.waitForURL("/getting-started");
      await expect(page.locator('text="Connect your calendar"').first()).toBeVisible(); // Fix race condition

      await test.step("step 1 - User Settings", async () => {
        const onboarding = page.getByTestId("onboarding");
        const form = onboarding.locator("form").first();
        const submitButton = form.getByTestId("connect-calendar-button");

        // Check required fields
        await submitButton.click();
        await expect(page.locator("data-testid=required")).toBeVisible();

        // happy path
        await form.locator("input[name=username]").fill("new user onboarding");
        await form.getByLabel("Full name").fill("new user 2");
        await form.locator("input[role=combobox]").click();
        await page
          .locator("*")
          .filter({ hasText: /^Europe\/London/ })
          .first()
          .click();
        await submitButton.click();

        await expect(page).toHaveURL(/.*connected-calendar/);

        const userComplete = await user.self();
        expect(userComplete.name).toBe("new user 2");
      });

      await test.step("step 2 - Connected Calendar", async () => {
        const isDisabled = await page.locator("button[data-testid=save-calendar-button]").isDisabled();
        await expect(isDisabled).toBe(true);
        // tests skip button, we don't want to test entire flow.
        await page.locator("button[data-testid=skip-step]").click();
        await expect(page).toHaveURL(/.*connected-video/);
      });

      await test.step("step 3 - Connected Video", async () => {
        const isDisabled = await page.locator("button[data-testid=save-video-button]").isDisabled();
        await expect(isDisabled).toBe(true);
        // tests skip button, we don't want to test entire flow.
        await page.locator("button[data-testid=skip-step]").click();
        await expect(page).toHaveURL(/.*setup-availability/);
      });

      await test.step("step 4 - Setup Availability", async () => {
        const isDisabled = await page.locator("button[data-testid=save-availability]").isDisabled();
        await expect(isDisabled).toBe(false);
        // same here, skip this step.

        await page.locator("button[data-testid=save-availability]").click();
        await expect(page).toHaveURL(/.*user-profile/);
      });

      await test.step("step 5- User Profile", async () => {
        const onboarding = page.getByTestId("onboarding");
        const form = onboarding.locator("form").first();
        const submitButton = form.getByRole("button", { name: "Finish setup and get started" });
        await submitButton.click();
        // should redirect to /event-types after onboarding
        await page.waitForURL("/event-types");

        const userComplete = await user.self();
        expect(userComplete.bio?.replace("<p><br></p>", "").length).toBe(0);
      });
    });
  };

  testOnboarding(IdentityProvider.GOOGLE);
  testOnboarding(IdentityProvider.CAL);
  testOnboarding(IdentityProvider.SAML);
});
