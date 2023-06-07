import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";

import { test } from "./lib/fixtures";
import { assertToasterText } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Teams", () => {
  test("Can create teams via Wizard", async ({ page, users }) => {
    const user = await users.create();
    const inviteeEmail = `${user.username}+invitee@example.com`;
    let slug: string | RegExp;
    await user.apiLogin();
    await page.goto("/teams");

    await test.step("Can create team", async () => {
      await page.locator("text=Create Team").click();
      await page.waitForURL("/settings/teams/new");
      await page.locator('input[name="name"]').fill(`${user.username}'s Team`);
      slug = await page.locator(`[name='slug']`).innerText();
      await page.locator("text=Continue").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members$/i);
      await page.waitForSelector('[data-testid="pending-member-list"]');
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(1);
    });

    await test.step("Can add members", async () => {
      await page.locator('[data-testid="new-member-button"]').click();
      await page.locator('[placeholder="email\\@example\\.com"]').fill(inviteeEmail);
      await page.locator('[data-testid="invite-new-member-button"]').click();
      await expect(page.locator(`li:has-text("${inviteeEmail}")`)).toBeVisible();
      await assertToasterText(page, `toast-success`, `${inviteeEmail} has been invited`);
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(2);
    });

    await test.step("Can remove members", async () => {
      const removeMemberButton = page.locator('[data-testid="remove-member-button"]');
      await removeMemberButton.click();
      await removeMemberButton.waitFor({ state: "hidden" });
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(1);
      // Cleanup here since this user is created without our fixtures.
      await prisma.user.delete({ where: { email: inviteeEmail } });
    });

    await test.step("Can publish team", async () => {
      await page.locator("text=Publish team").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/profile$/i);
      await expect(await page.locator(`[name='slug']`)).toHaveValue(slug);
    });

    await test.step("Can disband team", async () => {
      await page.locator("text=Disband Team").click();
      await page.locator("text=Yes, disband team").click();
      await page.waitForURL("/teams");
      await expect(await page.locator(`text=${user.username}'s Team`).count()).toEqual(0);
      // FLAKY: If other tests are running async this may mean there are >0 teams, empty screen will not be shown.
      // await expect(page.locator('[data-testid="empty-screen"]')).toBeVisible();
      // This is not the case since a random user is getting created for this test
    });
  });
});
