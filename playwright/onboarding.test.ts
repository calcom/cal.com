import { test } from "@playwright/test";

test.use({ storageState: "onboardingStorageState.json" });

test("redirects to /getting-started after login", async ({ page }) => {
  await page.waitForNavigation({
    url(url) {
      return url.pathname === "/getting-started";
    },
  });
});
