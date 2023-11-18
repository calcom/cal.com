import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { test } from "../lib/fixtures";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, emails, clipboard }) => {
  clipboard.reset();
  await users.deleteAll();
  emails?.deleteAll();
});

test.describe("Team", () => {
  test("Invitation (non verified)", async ({ browser, page, users, emails, clipboard }) => {
    const teamOwner = await users.create(undefined, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeam();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);
    await page.waitForLoadState("networkidle");

    await test.step("To the team by email (external user)", async () => {
      const invitedUserEmail = `rick_${Date.now()}@domain-${Date.now()}.com`;
      await page.locator('button:text("Add")').click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator('button:text("Send Invite")').click();
      await page.waitForLoadState("networkidle");
      const inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${team.name}'s admin invited you to join the team ${team.name} on Cal.com`,
        "signup?token"
      );

      //Check newly invited member exists and is pending
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(1);

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!inviteLink) return null;

      // Follow invite link to new window
      const context = await browser.newContext();
      const newPage = await context.newPage();
      await newPage.goto(inviteLink);
      await newPage.waitForLoadState("networkidle");

      // Check required fields
      await newPage.locator("button[type=submit]").click();
      await expect(newPage.locator(".text-red-700")).toHaveCount(3);
      await newPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await newPage.locator("button[type=submit]").click();
      await newPage.waitForURL("/getting-started?from=signup");
      await context.close();
      await newPage.close();

      // Check newly invited member is not pending anymore
      await page.bringToFront();
      await page.goto(`/settings/teams/${team.id}/members`);
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(0);
    });

    await test.step("To the team by invite link", async () => {
      const user = await users.create({
        email: `user-invite-${Date.now()}@domain.com`,
        password: "P4ssw0rd!",
      });
      await page.locator('button:text("Add")').click();
      await page.locator(`[data-testid="copy-invite-link-button"]`).click();
      const inviteLink = await clipboard.get();
      await page.waitForLoadState("networkidle");

      const context = await browser.newContext();
      const inviteLinkPage = await context.newPage();
      await inviteLinkPage.goto(inviteLink);
      await inviteLinkPage.waitForLoadState("domcontentloaded");

      await inviteLinkPage.locator("button[type=submit]").click();
      await expect(inviteLinkPage.locator(".text-red-700")).toHaveCount(2);

      await inviteLinkPage.locator("input[name=email]").fill(user.email);
      await inviteLinkPage.locator("input[name=password]").fill(user.username || "P4ssw0rd!");
      await inviteLinkPage.locator("button[type=submit]").click();

      await inviteLinkPage.waitForURL(`${WEBAPP_URL}/teams**`);
    });
  });

  test("Invitation (verified)", async ({ browser, page, users, emails }) => {
    const teamOwner = await users.create({ name: `team-owner-${Date.now()}` }, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeam();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);
    await page.waitForLoadState("networkidle");

    await test.step("To the organization by email (internal user)", async () => {
      const invitedUserEmail = `rick@example.com`;
      await page.locator('button:text("Add")').click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator('button:text("Send Invite")').click();
      await page.waitForLoadState("networkidle");
      await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${teamOwner.name} invited you to join the team ${team.name} on Cal.com`
      );

      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(1);
    });
  });
});
