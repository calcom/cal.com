import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking Filters", () => {
  test("Member role should not see the member filter", async ({ page, users }) => {
    const teamMateName = "team mate 1";
    await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      teammates: [{ name: teamMateName }],
    });

    const allUsers = await users.get();
    const memberUser = allUsers.find((user) => user.name === teamMateName);

    // eslint-disable-next-line playwright/no-conditional-in-test
    if (!memberUser) {
      throw new Error("user should exist");
    }

    await memberUser.apiLogin();
    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;
    await page.locator('[data-testid="add-filter-button"]').click();
    await expect(page.locator('[data-testid="add-filter-item-userId"]')).toBeHidden();
  });

  test("Admin role should see the member filter", async ({ page, users }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });

    await owner.apiLogin();
    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;
    await page.locator('[data-testid="add-filter-button"]').click();
    await expect(page.locator('[data-testid="add-filter-item-userId"]')).toBeVisible();
  });
});
