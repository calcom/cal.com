import { test } from "../../lib/fixtures";

const ALL_APPS = ["fathom", "matomo", "plausible", "ga4", "gtm", "metapixel"];

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Check analytics Apps", () => {
  test("Check analytics Apps by skipping the configure step", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/apps/");
    await appsPage.goToAppsCategory("analytics");
    for (const app of ALL_APPS) {
      await appsPage.installAnalyticsAppSkipConfigure(app);
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

  test("Check fathom App using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    await page.goto("/apps/categories/analytics");
    await appsPage.installAnalyticsApp("fathom", eventTypesIds);

    for (const id of eventTypesIds) {
      await appsPage.verifyAppsInfoNew(ALL_APPS, id);
    }
  });

  test("Check matomo App using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    await page.goto("/apps/categories/analytics");
    await appsPage.installAnalyticsApp("matomo", eventTypesIds);

    for (const id of eventTypesIds) {
      await appsPage.verifyAppsInfoNew(ALL_APPS, id);
    }
  });

  test("Check plausible App using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    await page.goto("/apps/categories/analytics");
    await appsPage.installAnalyticsApp("plausible", eventTypesIds);

    for (const id of eventTypesIds) {
      await appsPage.verifyAppsInfoNew(ALL_APPS, id);
    }
  });

  test("Check ga4 App using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    await page.goto("/apps/categories/analytics");
    await appsPage.installAnalyticsApp("ga4", eventTypesIds);

    for (const id of eventTypesIds) {
      await appsPage.verifyAppsInfoNew(ALL_APPS, id);
    }
  });

  test("Check gtm App using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    await page.goto("/apps/categories/analytics");
    await appsPage.installAnalyticsApp("gtm", eventTypesIds);

    for (const id of eventTypesIds) {
      await appsPage.verifyAppsInfoNew(ALL_APPS, id);
    }
  });

  test("Check metapixel App using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypesIds = eventTypes.map((item) => item.id);

    await page.goto("/apps/categories/analytics");
    await appsPage.installAnalyticsApp("metapixel", eventTypesIds);

    for (const id of eventTypesIds) {
      await appsPage.verifyAppsInfoNew(ALL_APPS, id);
    }
  });
});
