import { expect, test } from "@playwright/test";

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

  const username = "calendso";
  test(`/getting-started?username=${username} shows the first step of onboarding with username field populated`, async ({
    page,
  }) => {
    await page.goto("/getting-started?username=" + username);

    await page.waitForSelector("[data-testid=username]");

    await expect(await page.$eval("[data-testid=username]", (el: HTMLInputElement) => el.value)).toEqual(
      username
    );
  });
});
