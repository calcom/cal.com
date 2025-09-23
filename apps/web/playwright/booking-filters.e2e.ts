import { expect } from "@playwright/test";

import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking Filters", () => {
  test("Member role should not see the member filter", async ({ page, users }) => {
    const proUser = await users.create(
      {
        username: "pro",
        password: "pro",
        name: "pro-user",
      },
      {
        hasTeam: true,
        teamRole: MembershipRole.ADMIN,
      }
    );

    const teamId = (await proUser.getFirstTeamMembership()).teamId;

    const memberUser = await users.create(
      {
        username: "member",
        password: "member",
        name: "member-user",
      },
      {
        teamId: teamId,
        teamRole: MembershipRole.MEMBER,
      }
    );

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
