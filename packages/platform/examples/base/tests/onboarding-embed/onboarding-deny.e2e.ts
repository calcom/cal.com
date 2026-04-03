import { test, expect } from "@playwright/test";

import {
  openOnboardingEmbed,
  onboardingDialog,
  dispatchCalMessage,
  checkDeniedOutput,
} from "./helpers";

test.describe("Authorization Denied", () => {
  test.describe("Callback mode (onAuthorizationDenied provided)", () => {
    test("onAuthorizationDenied fires and dialog closes on authorization:denied message", async ({
      page,
    }) => {
      await page.goto("/e2e/onboarding-deny-hook");
      await openOnboardingEmbed(page);

      await dispatchCalMessage(page, { type: "authorization:denied" });

      await checkDeniedOutput(page);
      await expect(onboardingDialog(page)).not.toBeVisible();
    });
  });

  test.describe("Redirect mode (no onAuthorizationDenied)", () => {
    test("redirects to redirectUri with error=access_denied on authorization:denied message", async ({
      page,
    }) => {
      await page.goto("/e2e/onboarding-deny-redirect");
      await openOnboardingEmbed(page);

      const state = await page.locator("#embed-state").getAttribute("data-state");

      await dispatchCalMessage(page, { type: "authorization:denied" });

      await page.waitForURL((url) => url.href.includes("error=access_denied"), { timeout: 5_000 });

      const currentUrl = new URL(page.url());
      expect(currentUrl.searchParams.get("error")).toBe("access_denied");
      expect(currentUrl.searchParams.get("state")).toBe(state);
    });
  });
});
