import { expect } from "@playwright/test";

import prisma from "@calcom/prisma";

import { test } from "../lib/fixtures";
import { getInviteLink } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, emails }) => {
  await users.deleteAll();
  emails?.deleteAll();
});

test.describe("Organization", () => {
  test("Invitation (non verified)", async ({ browser, page, users, emails }) => {
    const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true });
    const { team: org } = await orgOwner.getOrgMembership();
    await orgOwner.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("networkidle");

    await test.step("To the organization by email (external user)", async () => {
      const invitedUserEmail = `rick-${Date.now()}@domain.com`;
      // '-domain' because the email doesn't match orgAutoAcceptEmail
      const usernameDerivedFromEmail = `${invitedUserEmail.split("@")[0]}-domain`;
      await page.locator('button:text("Add")').click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator('button:text("Send invite")').click();
      await page.waitForLoadState("networkidle");
      const inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${org.name}'s admin invited you to join the organization ${org.name} on Cal.com`,
        "signup?token"
      );

      // Check newly invited member exists and is pending
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(1);

      assertInviteLink(inviteLink);

      // Follow invite link in new window
      const context = await browser.newContext();
      const signupPage = await context.newPage();
      signupPage.goto(inviteLink);
      await expect(signupPage.locator(`[data-testid="signup-usernamefield"]`)).toBeDisabled();
      await expect(signupPage.locator(`[data-testid="signup-emailfield"]`)).toBeDisabled();
      await signupPage.waitForLoadState("networkidle");

      // Check required fields
      await signupPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await signupPage.locator("button[type=submit]").click();
      await signupPage.waitForURL("/getting-started?from=signup");
      const dbUser = await prisma.user.findUnique({ where: { email: invitedUserEmail } });
      expect(dbUser?.username).toBe(usernameDerivedFromEmail);
      await context.close();
      await signupPage.close();

      // Check newly invited member is not pending anymore
      await page.bringToFront();
      await page.goto("/settings/organizations/members");
      page.locator(`[data-testid="login-form"]`);
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(0);
    });

    await test.step("To the organization by invite link", async () => {
      // Get the invite link
      await page.locator('button:text("Add")').click();
      await page.locator(`[data-testid="copy-invite-link-button"]`).click();

      const inviteLink = await getInviteLink(page);
      // Follow invite link in new window
      const context = await browser.newContext();
      const inviteLinkPage = await context.newPage();
      await inviteLinkPage.goto(inviteLink);
      await inviteLinkPage.waitForLoadState("networkidle");

      // Check required fields
      const button = inviteLinkPage.locator("button[type=submit][disabled]");
      await expect(button).toBeVisible(); // email + 3 password hints

      // Happy path
      const email = `rick-${Date.now()}@domain.com`;
      // '-domain' because the email doesn't match orgAutoAcceptEmail
      const usernameDerivedFromEmail = `${email.split("@")[0]}-domain`;
      await inviteLinkPage.locator("input[name=email]").fill(email);
      await inviteLinkPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await inviteLinkPage.locator("button[type=submit]").click();
      await inviteLinkPage.waitForURL("/getting-started");
      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser?.username).toBe(usernameDerivedFromEmail);
    });
  });

  test("Invitation (verified)", async ({ browser, page, users, emails }) => {
    const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true, isOrgVerified: true });
    const { team: org } = await orgOwner.getOrgMembership();
    await orgOwner.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("networkidle");

    await test.step("To the organization by email (internal user)", async () => {
      const invitedUserEmail = `rick-${Date.now()}@example.com`;
      const usernameDerivedFromEmail = invitedUserEmail.split("@")[0];
      await page.locator('button:text("Add")').click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator('button:text("Send invite")').click();
      await page.waitForLoadState("networkidle");
      const inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${org.name}'s admin invited you to join the organization ${org.name} on Cal.com`,
        "signup?token"
      );

      assertInviteLink(inviteLink);

      // Check newly invited member exists and is not pending
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(0);

      // Follow invite link in new window
      const context = await browser.newContext();
      const signupPage = await context.newPage();
      signupPage.goto(inviteLink);
      await expect(signupPage.locator(`[data-testid="signup-usernamefield"]`)).toBeDisabled();
      await expect(signupPage.locator(`[data-testid="signup-emailfield"]`)).toBeDisabled();
      await signupPage.waitForLoadState("networkidle");

      // Check required fields
      await signupPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await signupPage.locator("button[type=submit]").click();
      await signupPage.waitForURL("/getting-started?from=signup");
      const dbUser = await prisma.user.findUnique({ where: { email: invitedUserEmail } });
      expect(dbUser?.username).toBe(usernameDerivedFromEmail);
      await context.close();
      await signupPage.close();
    });

    await test.step("To the organization by invite link", async () => {
      // Get the invite link
      await page.locator('button:text("Add")').click();
      await page.locator(`[data-testid="copy-invite-link-button"]`).click();

      const inviteLink = await getInviteLink(page);
      // Follow invite link in new window
      const context = await browser.newContext();
      const inviteLinkPage = await context.newPage();
      await inviteLinkPage.goto(inviteLink);
      await inviteLinkPage.waitForLoadState("networkidle");

      // Check required fields
      const button = inviteLinkPage.locator("button[type=submit][disabled]");
      await expect(button).toBeVisible(); // email + 3 password hints

      // Happy path
      const email = `rick-${Date.now()}@example.com`;
      // '-domain' because the email doesn't match orgAutoAcceptEmail
      const usernameDerivedFromEmail = `${email.split("@")[0]}`;
      await inviteLinkPage.locator("input[name=email]").fill(email);
      await inviteLinkPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await inviteLinkPage.locator("button[type=submit]").click();
      await inviteLinkPage.waitForURL("/getting-started");
      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser?.username).toBe(usernameDerivedFromEmail);
    });
  });
});

function assertInviteLink(inviteLink: string | null | undefined): asserts inviteLink is string {
  if (!inviteLink) throw new Error("Invite link not found");
}
