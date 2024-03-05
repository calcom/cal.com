import { loginUser } from "../../fixtures/regularBookings";
import { test } from "../../lib/fixtures";

const ALL_APPS = ["fathom", "matomo", "plausible", "ga4", "gtm", "metapixel"];

test.describe("Check analytics Apps", () => {
  test.beforeEach(async ({ page, users }) => {
    await loginUser(users);
    await page.goto("/apps/");
  });

  test("Check analytics Apps", async ({ appsPage, page }) => {
    await appsPage.goToAppsCategory("analytics");
    await appsPage.installApp("fathom");
    await appsPage.goBackToAppsPage();
    await appsPage.installApp("matomo");
    await appsPage.goBackToAppsPage();
    await appsPage.installApp("plausible");
    await appsPage.goBackToAppsPage();
    await appsPage.installApp("ga4");
    await appsPage.goBackToAppsPage();
    await appsPage.installApp("gtm");
    await appsPage.goBackToAppsPage();
    await appsPage.installApp("metapixel");
    await appsPage.goBackToAppsPage();
    await page.goto("/event-types");
    await appsPage.goToEventType("30 min");
    await appsPage.goToAppsTab();
    await appsPage.verifyAppsInfo(0);
    for (const app of ALL_APPS) {
      await appsPage.activeApp(app);
    }
    await appsPage.verifyAppsInfo(6);
  });
});
