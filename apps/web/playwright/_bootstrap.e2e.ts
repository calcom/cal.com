import { test } from "./lib/fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Bootstrap - Generate Storage States", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Generate storage states for all flow branches", async ({ page, users }) => {
    const loginUser = await users.create({ username: "login-user" });
    await loginUser.apiLogin();
    await page.goto("/event-types");
    await page.waitForLoadState("networkidle");
    await page.context().storageState({ path: "apps/web/playwright/state/login.json" });

    const bookingsUser = await users.create({ username: "bookings-user" });
    await bookingsUser.apiLogin();
    await page.goto("/bookings/upcoming");
    await page.waitForLoadState("networkidle");
    await page.context().storageState({ path: "apps/web/playwright/state/login-bookings.json" });

    const appsUser = await users.create({ username: "apps-user" });
    await appsUser.apiLogin();
    await page.goto("/apps/");
    await page.waitForLoadState("networkidle");
    await page.context().storageState({ path: "apps/web/playwright/state/login-apps.json" });

    const settingsUser = await users.create({ username: "settings-user" });
    await settingsUser.apiLogin();
    await page.goto("/settings/my-account/appearance");
    await page.waitForLoadState("networkidle");
    await page.context().storageState({ path: "apps/web/playwright/state/login-settings.json" });

    const adminUser = await users.create({ role: "ADMIN", username: "admin-user" });
    await adminUser.apiLogin();
    await page.goto("/settings/admin");
    await page.waitForLoadState("networkidle");
    await page.context().storageState({ path: "apps/web/playwright/state/login-settings-admin.json" });
  });
});
