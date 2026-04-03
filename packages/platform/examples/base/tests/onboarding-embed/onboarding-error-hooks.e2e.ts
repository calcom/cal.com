import { test, expect } from "@playwright/test";

import {
  openOnboardingEmbed,
  closeIframe,
  onboardingDialog,
  dispatchCalMessage,
  getErrorOutput,
  getCloseOutput,
} from "./helpers";

test.describe("Onboarding Error Hooks", () => {
  test.describe("Error Handling", () => {
    test("STATE_MISMATCH — onError fires when postMessage state differs from prop", async ({
      page,
    }) => {
      await page.goto("/e2e/onboarding-error-hooks");
      const frame = await openOnboardingEmbed(page);
      await frame.locator("body").waitFor({ timeout: 30_000 });

      await dispatchCalMessage(page, {
        type: "authorization:allowed",
        code: "fake-auth-code",
        state: "wrong-state-value",
      });

      const error = await getErrorOutput(page);
      expect(error.code).toBe("STATE_MISMATCH");
      expect(error.message).toContain("State mismatch");
    });

    test("SIGNUP_FAILED — onError fires on signup error postMessage", async ({ page }) => {
      await page.goto("/e2e/onboarding-error-hooks");
      await openOnboardingEmbed(page);

      await dispatchCalMessage(page, {
        type: "onboarding:error",
        code: "SIGNUP_FAILED",
        message: "Email already taken",
      });

      const error = await getErrorOutput(page);
      expect(error.code).toBe("SIGNUP_FAILED");
      expect(error.message).toBe("Email already taken");
    });

    test("ONBOARDING_FAILED — onError fires on onboarding error postMessage", async ({ page }) => {
      await page.goto("/e2e/onboarding-error-hooks");
      await openOnboardingEmbed(page);

      await dispatchCalMessage(page, {
        type: "onboarding:error",
        code: "ONBOARDING_FAILED",
        message: "Failed to save personal settings",
      });

      const error = await getErrorOutput(page);
      expect(error.code).toBe("ONBOARDING_FAILED");
      expect(error.message).toBe("Failed to save personal settings");
    });

    test("AUTHORIZATION_FAILED — onError fires on authorization error postMessage", async ({
      page,
    }) => {
      await page.goto("/e2e/onboarding-error-hooks");
      await openOnboardingEmbed(page);

      await dispatchCalMessage(page, {
        type: "onboarding:error",
        code: "AUTHORIZATION_FAILED",
        message: "Invalid redirect URI",
      });

      const error = await getErrorOutput(page);
      expect(error.code).toBe("AUTHORIZATION_FAILED");
      expect(error.message).toBe("Invalid redirect URI");
    });
  });

  test.describe("onClose Hook", () => {
    test("onClose fires when dialog is dismissed via close button", async ({ page }) => {
      await page.goto("/e2e/onboarding-error-hooks");
      await openOnboardingEmbed(page);
      await closeIframe(page);
      await getCloseOutput(page);
    });

    test("onClose fires on onboarding:close postMessage", async ({ page }) => {
      await page.goto("/e2e/onboarding-error-hooks");
      await openOnboardingEmbed(page);

      await dispatchCalMessage(page, { type: "onboarding:close" });

      await getCloseOutput(page);
      await expect(onboardingDialog(page)).not.toBeVisible();
    });
  });
});
