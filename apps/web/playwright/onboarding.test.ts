import { expect, test } from "@playwright/test";

import prisma from "@lib/prisma";

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

  test.describe("Onboarding", () => {
    // Using logged in state from globalSetup
    test.use({ storageState: "playwright/artifacts/onboardingStorageState.json" });

    test("update onboarding username", async ({ page }) => {
      // Try to go getting started with a available username
      await page.goto("/getting-started?username=alwaysavailable");
      // It should redirect you to the getting-started page
      await page.waitForSelector("[data-testid=onboarding]");
      const continueButton = page.locator("[data-testid=continue-button-0]");
      await continueButton.click();
      await page.waitForTimeout(1000);

      const updatedUser = await prisma.user.findUnique({
        where: { email: "onboarding@example.com" },
        select: { id: true, username: true },
      });

      expect(updatedUser?.username).toBe("alwaysavailable");

      // Revert DB change
      await prisma.user.update({
        where: {
          email: "onboarding@example.com",
        },
        data: {
          completedOnboarding: false,
        },
      });
    });
  });
});
