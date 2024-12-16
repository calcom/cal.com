/* eslint-disable playwright/no-skipped-test */
import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "serial" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding", () => {
  test.describe("Onboarding v2", () => {
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

          if (identityProvider === IdentityProvider.GOOGLE) {
            await expect(page).toHaveURL(/.*setup-availability/);
          } else {
            await expect(page).toHaveURL(/.*connected-calendar/);
          }

          const userComplete = await user.self();
          expect(userComplete.name).toBe("new user 2");
        });

        if (identityProvider !== IdentityProvider.GOOGLE) {
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
        }

        await test.step("step 4 - Setup Availability", async () => {
          const isDisabled = await page.locator("button[data-testid=save-availability]").isDisabled();
          await expect(isDisabled).toBe(false);
          // same here, skip this step.
          await page.locator("button[data-testid=save-availability]").click();

          await expect(page).toHaveURL(/.*user-profile/);
        });

        await test.step("step 5- User Profile", async () => {
          await page.locator("button[type=submit]").click();

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
});
