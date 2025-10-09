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
      await expect(page.locator('text="Next Step"')).toBeVisible(); // Fix race condition

      await test.step("step 1 - User Settings", async () => {
        // Check required fields
        await page.locator("button[type=submit]").click();
        await expect(page.locator("data-testid=required")).toBeVisible();

        // happy path
        await page.locator("input[name=username]").fill("new user onboarding");
        await page.locator("input[name=name]").fill("new user 2");
        await page.locator("input[role=combobox]").click();
        await page
          .locator("*")
          .filter({ hasText: /^Europe\/London/ })
          .first()
          .click();
        await page.locator("button[type=submit]").click();

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

      await test.step("step 3 - Connected Video (Final Step)", async () => {
        const isDisabled = await page.locator("button[data-testid=finish-setup-button]").isDisabled();
        await expect(isDisabled).toBe(true);
        // Since we can't test the actual video app connection, we'll skip this step
        // and expect to be redirected to /event-types
        await page.locator("button[data-testid=finish-setup-button]").click();
        await page.waitForURL("/event-types");
      });
    });
  };

  testOnboarding(IdentityProvider.GOOGLE);
  testOnboarding(IdentityProvider.CAL);
  testOnboarding(IdentityProvider.SAML);
});
