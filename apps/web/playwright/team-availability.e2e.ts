import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Team Availability", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("page loads", async ({ page, users }) => {
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
        teammates: teamMatesObj,
      }
    );

    await owner.apiLogin();

    await page.goto("/availability?type=team");

    await page.waitForSelector('div[data-testid="data-table"] table');
    const rows = await page.locator('div[data-testid="data-table"] table tbody tr').count();
    expect(rows).toBe(teamMatesObj.length + 1);
  });
});
