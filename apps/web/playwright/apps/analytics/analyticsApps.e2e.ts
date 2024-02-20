import { test } from "../../lib/fixtures";

const ALL_APPS = ["fathom", "matomo", "plausible", "ga4", "gtm", "metapixel"];

test.describe("Check analytics Apps", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/apps/");
  });
  test("Check analytics Apps", async ({ appsPage, page }) => {
    await appsPage.goToAppsCategory("analytics");
    await appsPage.goToApp("fathom");
    await appsPage.goBackToAppsPage();
    await appsPage.goToApp("matomo");
    await appsPage.goBackToAppsPage();
    await appsPage.goToApp("plausible");
    await appsPage.goBackToAppsPage();
    await appsPage.goToApp("ga4");
    await appsPage.goBackToAppsPage();
    await appsPage.goToApp("gtm");
    await appsPage.goBackToAppsPage();
    await appsPage.goToApp("metapixel");
    await page.goto("/event-types");
    await appsPage.goToEventType("30 min");
    await appsPage.goToAppsTab();
    await appsPage.verifyAppsInfo(0);
    ALL_APPS.forEach(async (app) => {
      await appsPage.checkAndFillApp(app);
    });
    await appsPage.verifyAppsInfo(6);
  });
});
