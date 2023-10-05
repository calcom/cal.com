import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Teams", () => {
  test("Profile page is loaded for users in Organization", async ({ page, users }) => {
    const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];
    const owner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      hasSubteam: true,
      teammates: teamMatesObj,
    });
    await owner.apiLogin();
    await page.goto("/settings/my-account/profile");

    // check if user avatar is loaded
    await expect(page.locator('[data-testid="organization-avatar"]')).toBeVisible();
  });
});
