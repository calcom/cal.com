import { expect, test } from "@playwright/test";

import prisma from "@calcom/prisma";

test.describe("Onboarding", () => {
  test.use({ storageState: "playwright/artifacts/onboardingStorageState.json" });

  // You want to always reset account completedOnboarding after each test
  test.afterEach(async () => {
    // Revert DB change
    await prisma.user.update({
      where: {
        email: "onboarding@example.com",
      },
      data: {
        username: "onboarding",
        completedOnboarding: false,
      },
    });
  });

  test("redirects to /getting-started after login", async ({ page }) => {
    await page.goto("/event-types");
    await page.waitForNavigation({
      url(url) {
        return url.pathname === "/getting-started";
      },
    });
  });

  test.describe("Onboarding", () => {
    test("update onboarding username via localstorage", async ({ page }) => {
      /**
       * We need to come up with a better test since all test are run in an incognito window.
       * Meaning that all localstorage access is null here.
       */
      test.fixme();
      await page.addInitScript(() => {
        window.localStorage.setItem("username", "alwaysavailable");
      }, {});
      // Try to go getting started with a available username
      await page.goto("/getting-started");
      // Wait for useEffectUpdate to run
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(1000);

      const updatedUser = await prisma.user.findUnique({
        where: { email: "onboarding@example.com" },
        select: { id: true, username: true },
      });

      expect(updatedUser?.username).toBe("alwaysavailable");
    });
  });
});
