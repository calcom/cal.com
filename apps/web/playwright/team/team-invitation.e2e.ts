import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { test } from "../lib/fixtures";
import { localize, getInviteLink } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, emails }) => {
  await users.deleteAll();
  emails?.deleteAll();
});

test.describe("Team", () => {
  test("Invitation (non verified)", async ({ browser, page, users, emails }) => {
    const t = await localize("en");
    const teamOwner = await users.create(undefined, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeam();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);
    await page.waitForLoadState("networkidle");

    await test.step("To the team by email (external user)", async () => {
      const invitedUserEmail = `rick_${Date.now()}@domain-${Date.now()}.com`;
      await page.locator(`button:text("${t("add")}")`).click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator(`button:text("${t("send_invite")}")`).click();
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
      const button = newPage.locator("button[type=submit][disabled]");
      await expect(button).toBeVisible(); // email + 3 password hints

      // Check required fields
      await newPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await newPage.locator("button[type=submit]").click();
      await newPage.waitForURL("/getting-started?from=signup");
      await newPage.close();
      await context.close();

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
      await page.locator(`button:text("${t("add")}")`).click();
      await page.locator(`[data-testid="copy-invite-link-button"]`).click();
      const inviteLink = await getInviteLink(page);

      const context = await browser.newContext();
      const inviteLinkPage = await context.newPage();
      await inviteLinkPage.goto(inviteLink);
      await inviteLinkPage.waitForLoadState("domcontentloaded");

      await inviteLinkPage.locator("button[type=submit]").click();
      await expect(inviteLinkPage.locator('[data-testid="field-error"]')).toHaveCount(2);

      await inviteLinkPage.locator("input[name=email]").fill(user.email);
      await inviteLinkPage.locator("input[name=password]").fill(user.username || "P4ssw0rd!");
      await inviteLinkPage.locator("button[type=submit]").click();

      await inviteLinkPage.waitForURL(`${WEBAPP_URL}/teams**`);
    });
  });

  test("Invitation (verified)", async ({ browser, page, users, emails }) => {
    const t = await localize("en");
    const teamOwner = await users.create({ name: `team-owner-${Date.now()}` }, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeam();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);
    await page.waitForLoadState("networkidle");

    await test.step("To the organization by email (internal user)", async () => {
      const invitedUserEmail = `rick@example.com`;
      await page.locator(`button:text("${t("add")}")`).click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator(`button:text("${t("send_invite")}")`).click();
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
