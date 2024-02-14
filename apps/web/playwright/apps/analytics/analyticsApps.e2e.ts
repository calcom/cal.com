import { test } from "../../lib/fixtures";

const ALL_APPS = ["fathom", "matomo", "plausible", "ga4", "gtm", "metapixel"];

test.describe("Check analytics Apps", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/apps");
  });

  test("Check analytics Apps", async ({ appsPage }) => {
    await appsPage.goToAppsCategory("analytics");

    ALL_APPS.forEach(async (app, index) => {
      await appsPage.goToApp(app);
      await appsPage.goToEventTypesPage();
      await appsPage.goToEventType("30 min");
      await appsPage.goToAppsTab();
      await appsPage.checkAndFillApp(app);
      await appsPage.verifyAppsInfo(index + 1);
      await appsPage.goBackToAppsPage();
    });
  });
});
