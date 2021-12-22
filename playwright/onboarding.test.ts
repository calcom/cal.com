import { test } from "@playwright/test";

test.describe("Onboarding", () => {
  test.use({ storageState: "playwright/artifacts/onboardingStorageState.json" });

  test("redirects to /getting-started after login", async ({ page }) => {
    await page.goto("/event-types");
    await page.waitForNavigation({
      url(url) {
        return url.pathname === "/getting-started";
      },
    });
  });
});
