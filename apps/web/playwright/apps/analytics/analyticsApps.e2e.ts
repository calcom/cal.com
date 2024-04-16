import { test } from "../../lib/fixtures";

const ALL_APPS = ["fathom", "matomo", "plausible", "ga4", "gtm", "metapixel"];

test.describe("Check analytics Apps by skipping the flow in between", () => {
  test.beforeEach(async ({ page, users }) => {
    // await loginUser(users);

    const user = await users.create();
    await user.apiLogin();
    await page.goto("/apps/");
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Check analytics Apps", async ({ appsPage, page, users }) => {
    await appsPage.goToAppsCategory("analytics");
    for (const app of ALL_APPS) {
      await appsPage.installApp(app);
      await appsPage.goBackToAppsPage();
    }
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

test.describe("Check analytics Apps completing the new app install flow", () => {
  test("Check analytics Apps new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    for (let index = 0; index < ALL_APPS.length; index++) {
      const app = ALL_APPS[index];
      await page.goto("/apps/categories/analytics");
      await appsPage.installUsingNewAppInstallFlow(app, eventTypesIds);
      for (const id of eventTypesIds) {
        await appsPage.verifyAppsInfoNew(app, id, index + 1);
      }
    }
    await users.deleteAll();
  });
});
