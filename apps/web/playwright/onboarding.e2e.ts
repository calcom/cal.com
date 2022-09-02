import { expect } from "@playwright/test";

import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe("Onboarding", () => {
  test.beforeEach(async ({ users }) => {
    const onboardingUser = await users.create({ completedOnboarding: false });
    await onboardingUser.login();
  });
  test.afterEach(({ users }) => users.deleteAll());

  test("redirects to /getting-started after login", async ({ page }) => {
    await page.goto("/event-types");
    await page.waitForNavigation({
      url(url) {
        return url.pathname === "/getting-started";
      },
    });
  });

  test.describe("Onboarding", () => {
    test("update onboarding username via localstorage", async ({ page, users }) => {
      const [onboardingUser] = users.get();
      /**
       * TODO:
       * We need to come up with a better test since all test are run in an incognito window.
       * Meaning that all localstorage access is null here.
       * Let's try saving the desiredUsername in the metadata instead
       */
      test.fixme();
      await page.addInitScript(() => {
        // eslint-disable-next-line @calcom/eslint/avoid-web-storage
        window.localStorage.setItem("username", "alwaysavailable");
      }, {});
      // Try to go getting started with a available username
      await page.goto("/getting-started");
      // Wait for useEffectUpdate to run
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(1000);

      const updatedUser = await prisma.user.findUnique({
        where: { id: onboardingUser.id },
        select: { id: true, username: true },
      });

      expect(updatedUser?.username).toBe("alwaysavailable");
    });
  });
});
