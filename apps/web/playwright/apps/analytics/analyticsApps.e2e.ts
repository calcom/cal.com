import { test } from "../../lib/fixtures";

const ALL_APPS = ["gtm", "metapixel"];

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("check analytics Apps", () => {
  test.describe("check analytics apps by skipping the configure step", () => {
    ALL_APPS.forEach((app) => {
      test(`check analytics app: ${app} by skipping the configure step`, async ({
        appsPage,
        page,
        users,
      }) => {
        const user = await users.create();
        await user.apiLogin();
        await page.goto("apps/categories/analytics");
        await appsPage.installAnalyticsAppSkipConfigure(app);
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000); // waits for 1 second
        await page.goto("/event-types");
        await appsPage.goToEventType("30 min");
        await appsPage.goToAppsTab();
        await appsPage.verifyAppsInfo(0);
        await appsPage.activeApp(app);
        await appsPage.verifyAppsInfo(1);
      });
    });
  });
  test.describe("check analytics apps using the new flow", () => {
    ALL_APPS.forEach((app) => {
      test(`check analytics app: ${app}`, async ({ appsPage, page, users }) => {
        const user = await users.create();
        await user.apiLogin();
        const eventTypes = await user.getUserEventsAsOwner();
        const eventTypesIds = eventTypes.map((item) => item.id).slice(0, 1);
        await page.goto("/apps/categories/analytics");
        await appsPage.installAnalyticsApp(app, eventTypesIds);
        for (const id of eventTypesIds) {
          await appsPage.verifyAppsInfoNew(app, id);
        }
      });
    });
  });
});
