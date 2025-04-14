import { expect } from "@playwright/test";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";
import { fillStripeTestCheckout } from "../lib/testUtils";

test.describe("Teams", () => {
  test.afterEach(({ orgs, users }) => {
    orgs.deleteAll();
    users.deleteAll();
  });

  test("Can create teams via Wizard", async ({ page, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
    });
    const user = await users.create({
      organizationId: org.id,
      roleInOrganization: MembershipRole.ADMIN,
    });
    const inviteeEmail = `${user.username}+invitee@example.com`;
    await user.apiLogin();
    await page.goto("/teams");

    await test.step("Can create team", async () => {
      // Click text=Create Team
      await page.locator("text=Create a new Team").click();
      await page.waitForURL((url) => url.pathname === "/settings/teams/new");
      // Fill input[name="name"]
      await page.locator('input[name="name"]').fill(`${user.username}'s Team`);
      // Click text=Continue
      await page.click("[type=submit]");
      // TODO: Figure out a way to make this more reliable
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (IS_TEAM_BILLING_ENABLED) await fillStripeTestCheckout(page);
      await expect(page).toHaveURL(/\/settings\/teams\/(\d+)\/onboard-members.*$/i);
      await page.waitForSelector('[data-testid="pending-member-list"]');
      await expect(page.getByTestId("pending-member-item")).toHaveCount(1);
    });

    await test.step("Can add members", async () => {
      await page.getByTestId("new-member-button").click();
      await page.locator('[placeholder="email\\@example\\.com"]').fill(inviteeEmail);
      await page.getByTestId("invite-new-member-button").click();
      await expect(page.getByTestId("pending-member-item").filter({ hasText: inviteeEmail })).toBeVisible();

      // locator.count() does not await for the expected number of elements
      // https://github.com/microsoft/playwright/issues/14278
      // using toHaveCount() is more reliable
      await expect(page.getByTestId("pending-member-item")).toHaveCount(2);
    });

    await test.step("Can remove members", async () => {
      await expect(page.getByTestId("pending-member-item")).toHaveCount(2);
      const lastRemoveMemberButton = page.getByTestId("remove-member-button").last();
      await lastRemoveMemberButton.click();
      await expect(page.getByTestId("pending-member-item")).toHaveCount(1);

      // Cleanup here since this user is created without our fixtures.
      await prisma.user.delete({ where: { email: inviteeEmail } });
    });

    await test.step("Can finish team invitation", async () => {
      await page.getByTestId("publish-button").click();
      await expect(page).toHaveURL(/\/settings\/teams\/(\d+)\/event-type$/i);
    });

    await test.step("Can finish team creation", async () => {
      const locator = page.locator('div:has(input[value="ROUND_ROBIN"]) > button');
      await expect(locator).toBeVisible();
      await locator.click();
      await page.fill("[name=title]", "roundRobin");
      await page.getByTestId("finish-button").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/profile$/i);
    });

    await test.step("Can disband team", async () => {
      await page.getByTestId("disband-team-button").click();
      await page.getByTestId("dialog-confirmation").click();
      await page.waitForURL("/teams");
      expect(await page.locator(`text=${user.username}'s Team`).count()).toEqual(0);
    });
  });
});
