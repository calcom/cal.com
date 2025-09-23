import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking Filters", () => {
  test("Member role should not see the member filter", async ({ page, users, prisma }) => {
    const teamMateName = "team mate 1";
    const owner = await users.create(undefined, {
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
});
