import { test } from "./lib/fixtures";

test.describe("AppListCard", async () => {
  test("should remove the highlight from the URL", async ({ page, users }) => {
    const user = await users.create({});
    await user.apiLogin();

    await page.goto("/apps/installed/conferencing?hl=daily-video");

    await page.waitForLoadState();

    await page.waitForURL("/apps/installed/conferencing");
  });
});
