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
      await page.waitForLoadState("networkidle");
      // Fill team name input (new onboarding-v3 style flow)
      await page.locator('[data-testid="team-name-input"]').fill(`${user.username}'s Team`);
      // Click text=Continue
      await page.click("[type=submit]");
      // TODO: Figure out a way to make this more reliable
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (IS_TEAM_BILLING_ENABLED) await fillStripeTestCheckout(page);
      // Wait for the invite email page (new flow)
      await expect(page).toHaveURL(/\/settings\/teams\/new\/invite\/email.*$/i);
      await page.waitForLoadState("networkidle");
    });

    await test.step("Can add members via email invite", async () => {
      // Add member via email invite form
      await page.locator('input[type="email"]').first().fill(inviteeEmail);
      await page.click("[type=submit]");
      await page.waitForLoadState("networkidle");
      // Wait for redirect to teams page
      await expect(page).toHaveURL(/\/teams$/i);
    });

    await test.step("Can navigate to team settings", async () => {
      // Click on the team to go to settings
      await page.locator(`text=${user.username}'s Team`).click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/profile$/i);
    });

    await test.step("Can disband team", async () => {
      await page.getByTestId("disband-team-button").click();
      await page.getByTestId("dialog-confirmation").click();
      await page.waitForURL("/teams");
      expect(await page.locator(`text=${user.username}'s Team`).count()).toEqual(0);

      // Cleanup the invited user since they were created without our fixtures
      const invitedUser = await prisma.user.findUnique({ where: { email: inviteeEmail } });
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (invitedUser) {
        await prisma.user.delete({ where: { email: inviteeEmail } });
      }
    });
  });
});
