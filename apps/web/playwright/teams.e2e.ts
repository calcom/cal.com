import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Teams", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Can create teams via Wizard", async ({ page, users, prisma }) => {
    const user = await users.create();
    const inviteeEmail = `${user.username}+invitee@example.com`;
    await user.login();
    await page.goto("/teams");

    // Expect teams to be empty
    await expect(page.locator('[data-testid="empty-screen"]')).toBeVisible();

    await test.step("Can create team", async () => {
      // Click text=Create Team
      await page.locator("text=Create Team").click();
      await page.waitForURL("/settings/teams/new");
      // Fill input[name="name"]
      await page.locator('input[name="name"]').fill(`${user.username}'s Team`);
      // Click text=Continue
      await page.locator("text=Continue").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members$/i);
      await page.waitForSelector('[data-testid="pending-member-list"]');
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(1);
    });

    await test.step("Can add members", async () => {
      // Click [data-testid="new-member-button"]
      await page.locator('[data-testid="new-member-button"]').click();
      // Fill [placeholder="email\@example\.com"]
      await page.locator('[placeholder="email\\@example\\.com"]').fill(inviteeEmail);
      // Click [data-testid="invite-new-member-button"]
      await page.locator('[data-testid="invite-new-member-button"]').click();
      await expect(page.locator(`li:has-text("${inviteeEmail}PendingMemberNot on Cal.com")`)).toBeVisible();
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(2);
    });

    await test.step("Can remove members", async () => {
      const removeMemberButton = page.locator('[data-testid="remove-member-button"]');
      await removeMemberButton.click();
      await removeMemberButton.waitFor({ state: "hidden" });
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(1);
    });

    await test.step("Can publish team", async () => {
      await page.locator("text=Publish team").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/profile$/i);
    });

    await test.step("Can disband team", async () => {
      await page.locator("text=Delete Team").click();
      await page.locator("text=Yes, disband team").click();
      await page.waitForURL("/teams");
      await expect(page.locator('[data-testid="empty-screen"]')).toBeVisible();
    });
  });
});
