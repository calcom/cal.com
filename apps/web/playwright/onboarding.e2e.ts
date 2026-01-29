import { IdentityProvider } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding", () => {
  const testOnboardingV1 = (identityProvider: IdentityProvider): void => {
    test(`Onboarding V1 Flow - ${identityProvider} user`, async ({ page, users, features }) => {
      const onboardingV3Feature = features.get("onboarding-v3");
      const isV3Enabled = onboardingV3Feature?.enabled ?? false;

      test.skip(isV3Enabled, "Skipping V1 test because onboarding-v3 feature flag is enabled");

      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      await page.goto("/getting-started");
      await page.waitForURL("/getting-started");
      await expect(page.locator('text="Connect your calendar"').first()).toBeVisible();

      await test.step("step 1 - User Settings", async () => {
        const onboarding = page.getByTestId("onboarding");
        const form = onboarding.locator("form").first();
        const submitButton = form.getByTestId("connect-calendar-button");

        await submitButton.click();
        await expect(page.locator("data-testid=required")).toBeVisible();

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
        await page.locator("button[data-testid=skip-step]").click();
        await expect(page).toHaveURL(/.*connected-video/);
      });

      await test.step("step 3 - Connected Video", async () => {
        const isDisabled = await page.locator("button[data-testid=save-video-button]").isDisabled();
        await expect(isDisabled).toBe(true);
        await page.locator("button[data-testid=skip-step]").click();
        await expect(page).toHaveURL(/.*setup-availability/);
      });

      await test.step("step 4 - Setup Availability", async () => {
        const isDisabled = await page.locator("button[data-testid=save-availability]").isDisabled();
        await expect(isDisabled).toBe(false);

        await page.locator("button[data-testid=save-availability]").click();
        await expect(page).toHaveURL(/.*user-profile/);
      });

      await test.step("step 5- User Profile", async () => {
        const onboarding = page.getByTestId("onboarding");
        const form = onboarding.locator("form").first();
        const submitButton = form.getByRole("button", { name: "Finish setup and get started" });
        await submitButton.click();
        await page.waitForURL("/event-types");

        const userComplete = await user.self();
        expect(userComplete.bio?.replace("<p><br></p>", "").length).toBe(0);
      });
    });
  };

  const testOnboardingV3 = (identityProvider: IdentityProvider): void => {
    test(`Onboarding V3 Flow - ${identityProvider} user`, async ({ page, users, features }) => {
      const onboardingV3Feature = features.get("onboarding-v3");
      const isV3Enabled = onboardingV3Feature?.enabled ?? false;

      test.skip(!isV3Enabled, "Skipping V3 test because onboarding-v3 feature flag is disabled");

      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      await page.goto("/onboarding/getting-started");
      await page.waitForURL("/onboarding/getting-started");

      await test.step("step 1 - Plan Selection", async () => {
        await expect(page.getByText("Personal").first()).toBeVisible();

        await page.getByText("Personal").first().click();
        await page.getByRole("button", { name: "Continue" }).click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("step 2 - Personal Settings", async () => {
        await expect(page.getByText("Add your details").first()).toBeVisible();

        const nameInput = page.getByLabel("Your name");
        await nameInput.fill("new user v3");

        await page.getByRole("button", { name: "Continue" }).click();

        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
      });

      await test.step("step 3 - Connect Calendar", async () => {
        await expect(page.getByText("Connect your calendar").first()).toBeVisible();

        await page.getByRole("button", { name: "Skip for now" }).click();

        await page.waitForURL("/event-types");

        const userComplete = await user.self();
        expect(userComplete.name).toBe("new user v3");
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });
  };

  testOnboardingV1(IdentityProvider.GOOGLE);
  testOnboardingV1(IdentityProvider.CAL);
  testOnboardingV1(IdentityProvider.SAML);

  testOnboardingV3(IdentityProvider.GOOGLE);
  testOnboardingV3(IdentityProvider.CAL);
  testOnboardingV3(IdentityProvider.SAML);
});
