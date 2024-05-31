import { test } from "../../lib/fixtures";

const ALL_APPS = ["fathom", "matomo", "plausible", "ga4", "gtm", "metapixel"];

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Check analytics Apps ", () => {
  test("Check analytics Apps by skipping the configure step", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/apps/");
    await appsPage.goToAppsCategory("analytics");
    for (const app of ALL_APPS) {
      await appsPage.installAppSkipConfigure(app);
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

  test("Check analytics Apps using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    for (const app of ALL_APPS) {
      await page.goto("/apps/categories/analytics");
      await appsPage.installApp(app, eventTypesIds);
    }

    for (const id of eventTypesIds) {
      await appsPage.verifyAppsInfoNew(ALL_APPS, id);
    }
  });
});
