import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import prisma from "@calcom/prisma";

import { test } from "../lib/fixtures";
import { getInviteLink } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, orgs }) => {
  await users.deleteAll();
  await orgs.deleteAll();
});

test.describe("Organization", () => {
  test.describe("Email not matching orgAutoAcceptEmail", () => {
    test("Org Invitation", async ({ browser, page, users, emails }) => {
      const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true });
      const { team: org } = await orgOwner.getOrgMembership();
      await orgOwner.apiLogin();
      await page.goto("/settings/organizations/members");
      await page.waitForLoadState("networkidle");

      await test.step("By email", async () => {
        const invitedUserEmail = users.trackEmail({ username: "rick", domain: "domain.com" });
        // '-domain' because the email doesn't match orgAutoAcceptEmail
        const usernameDerivedFromEmail = `${invitedUserEmail.split("@")[0]}-domain`;

        await inviteAnEmail(page, invitedUserEmail);
        const inviteLink = await expectInvitationEmailToBeReceived(
          page,
          emails,
          invitedUserEmail,
          `${org.name}'s admin invited you to join the organization ${org.name} on Cal.com`,
          "signup?token"
        );

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: false,
          email: invitedUserEmail,
        });

        assertInviteLink(inviteLink);
        await signupFromEmailInviteLink({
          browser,
          inviteLink,
          expectedEmail: invitedUserEmail,
          expectedUsername: usernameDerivedFromEmail,
        });

        const dbUser = await prisma.user.findUnique({ where: { email: invitedUserEmail } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });
      });

      await test.step("By invite link", async () => {
        const inviteLink = await copyInviteLink(page);
        const email = users.trackEmail({ username: "rick", domain: "domain.com" });
        // '-domain' because the email doesn't match orgAutoAcceptEmail
        const usernameDerivedFromEmail = `${email.split("@")[0]}-domain`;
        await signupFromInviteLink({ browser, inviteLink, email });
        const dbUser = await prisma.user.findUnique({ where: { email } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);
        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email,
        });
      });
    });

    test("Team invitation", async ({ browser, page, users, emails }) => {
      const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true, hasSubteam: true });
      await orgOwner.apiLogin();
      const { team } = await orgOwner.getFirstTeamMembership();
      const { team: org } = await orgOwner.getOrgMembership();

      await test.step("By email", async () => {
        await page.goto(`/settings/teams/${team.id}/members`);
        await page.waitForLoadState("networkidle");
        const invitedUserEmail = users.trackEmail({ username: "rick", domain: "domain.com" });
        // '-domain' because the email doesn't match orgAutoAcceptEmail
        const usernameDerivedFromEmail = `${invitedUserEmail.split("@")[0]}-domain`;
        await inviteAnEmail(page, invitedUserEmail);
        await expectUserToBeAMemberOfTeam({
          page,
          teamId: team.id,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: false,
          email: invitedUserEmail,
        });

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: false,
          email: invitedUserEmail,
        });

        await page.waitForLoadState("networkidle");
        const inviteLink = await expectInvitationEmailToBeReceived(
          page,
          emails,
          invitedUserEmail,
          `${team.name}'s admin invited you to join the team ${team.name} of organization ${org.name} on Cal.com`,
          "signup?token"
        );

        assertInviteLink(inviteLink);

        await signupFromEmailInviteLink({
          browser,
          inviteLink,
          expectedEmail: invitedUserEmail,
          expectedUsername: usernameDerivedFromEmail,
        });

        const dbUser = await prisma.user.findUnique({ where: { email: invitedUserEmail } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);

        await expectUserToBeAMemberOfTeam({
          page,
          teamId: team.id,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });
      });

      await test.step("By invite link", async () => {
        await page.goto(`/settings/teams/${team.id}/members`);
        const inviteLink = await copyInviteLink(page);
        const email = users.trackEmail({ username: "rick", domain: "domain.com" });
        // '-domain' because the email doesn't match orgAutoAcceptEmail
        const usernameDerivedFromEmail = `${email.split("@")[0]}-domain`;
        await signupFromInviteLink({ browser, inviteLink, email });

        const dbUser = await prisma.user.findUnique({ where: { email } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);
        await expectUserToBeAMemberOfTeam({
          teamId: team.id,
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: email,
        });

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: email,
        });
      });
    });
  });

  test.describe("Email matching orgAutoAcceptEmail and a Verified Organization", () => {
    test("Org Invitation", async ({ browser, page, users, emails }) => {
      const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true, isOrgVerified: true });
      const { team: org } = await orgOwner.getOrgMembership();
      await orgOwner.apiLogin();
      await page.goto("/settings/organizations/members");
      await page.waitForLoadState("networkidle");

      await test.step("By email", async () => {
        const invitedUserEmail = users.trackEmail({ username: "rick", domain: "example.com" });
        const usernameDerivedFromEmail = invitedUserEmail.split("@")[0];
        await inviteAnEmail(page, invitedUserEmail);
        const inviteLink = await expectInvitationEmailToBeReceived(
          page,
          emails,
          invitedUserEmail,
          `${org.name}'s admin invited you to join the organization ${org.name} on Cal.com`,
          "signup?token"
        );

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });

        assertInviteLink(inviteLink);
        await signupFromEmailInviteLink({
          browser,
          inviteLink,
          expectedEmail: invitedUserEmail,
          expectedUsername: usernameDerivedFromEmail,
        });

        const dbUser = await prisma.user.findUnique({ where: { email: invitedUserEmail } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });
      });

      await test.step("By invite link", async () => {
        const inviteLink = await copyInviteLink(page);
        const email = users.trackEmail({ username: "rick", domain: "example.com" });
        const usernameDerivedFromEmail = email.split("@")[0];
        await signupFromInviteLink({ browser, inviteLink, email });

        const dbUser = await prisma.user.findUnique({ where: { email } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);
        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email,
        });
      });
    });

    test("Team Invitation", async ({ browser, page, users, emails }) => {
      const orgOwner = await users.create(undefined, {
        hasTeam: true,
        isOrg: true,
        hasSubteam: true,
        isOrgVerified: true,
      });
      const { team: org } = await orgOwner.getOrgMembership();
      const { team } = await orgOwner.getFirstTeamMembership();

      await orgOwner.apiLogin();

      await test.step("By email", async () => {
        await page.goto(`/settings/teams/${team.id}/members`);
        await page.waitForLoadState("networkidle");
        const invitedUserEmail = users.trackEmail({ username: "rick", domain: "example.com" });
        const usernameDerivedFromEmail = invitedUserEmail.split("@")[0];
        await inviteAnEmail(page, invitedUserEmail);
        await expectUserToBeAMemberOfTeam({
          page,
          teamId: team.id,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });
        const inviteLink = await expectInvitationEmailToBeReceived(
          page,
          emails,
          invitedUserEmail,
          `${team.name}'s admin invited you to join the organization ${org.name} on Cal.com`,
          "signup?token"
        );

        assertInviteLink(inviteLink);

        await signupFromEmailInviteLink({
          browser,
          inviteLink,
          expectedEmail: invitedUserEmail,
          expectedUsername: usernameDerivedFromEmail,
        });

        const dbUser = await prisma.user.findUnique({ where: { email: invitedUserEmail } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);

        await expectUserToBeAMemberOfTeam({
          page,
          teamId: team.id,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });

        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });
      });

      await test.step("By invite link", async () => {
        await page.goto(`/settings/teams/${team.id}/members`);

        const inviteLink = await copyInviteLink(page);
        const email = users.trackEmail({ username: "rick", domain: "example.com" });
        // '-domain' because the email doesn't match orgAutoAcceptEmail
        const usernameDerivedFromEmail = `${email.split("@")[0]}`;

        await signupFromInviteLink({ browser, inviteLink, email });

        const dbUser = await prisma.user.findUnique({ where: { email } });
        expect(dbUser?.username).toBe(usernameDerivedFromEmail);
        await expectUserToBeAMemberOfTeam({
          teamId: team.id,
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: email,
        });
        await expectUserToBeAMemberOfOrganization({
          page,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: email,
        });
      });
    });
  });
});

async function signupFromInviteLink({
  browser,
  inviteLink,
  email,
}: {
  browser: Browser;
  inviteLink: string;
  email: string;
}) {
  const context = await browser.newContext();
  const inviteLinkPage = await context.newPage();
  await inviteLinkPage.goto(inviteLink);
  await inviteLinkPage.waitForLoadState("networkidle");

  // Check required fields
  const button = inviteLinkPage.locator("button[type=submit][disabled]");
  await expect(button).toBeVisible(); // email + 3 password hints

  await inviteLinkPage.locator("input[name=email]").fill(email);
  await inviteLinkPage.locator("input[name=password]").fill(`P4ssw0rd!`);
  await inviteLinkPage.locator("button[type=submit]").click();
  await inviteLinkPage.waitForURL("/getting-started");
  return { email };
}

async function signupFromEmailInviteLink({
  browser,
  inviteLink,
  expectedUsername,
  expectedEmail,
}: {
  browser: Browser;
  inviteLink: string;
  expectedUsername: string;
  expectedEmail: string;
}) {
  // Follow invite link in new window
  const context = await browser.newContext();
  const signupPage = await context.newPage();

  signupPage.goto(inviteLink);
  await signupPage.locator(`[data-testid="signup-usernamefield"]`).waitFor({ state: "visible" });
  await expect(signupPage.locator(`[data-testid="signup-usernamefield"]`)).toBeDisabled();
  // await for value. initial value is ""
  await expect(signupPage.locator(`[data-testid="signup-usernamefield"]`)).toHaveValue(expectedUsername);

  await expect(signupPage.locator(`[data-testid="signup-emailfield"]`)).toBeDisabled();
  await expect(signupPage.locator(`[data-testid="signup-emailfield"]`)).toHaveValue(expectedEmail);

  await signupPage.waitForLoadState("networkidle");
  // Check required fields
  await signupPage.locator("input[name=password]").fill(`P4ssw0rd!`);
  await signupPage.locator("button[type=submit]").click();
  await signupPage.waitForURL("/getting-started?from=signup");
  await context.close();
  await signupPage.close();
}

async function inviteAnEmail(page: Page, invitedUserEmail: string) {
  await page.locator('button:text("Add")').click();
  await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
  await page.locator('button:text("Send invite")').click();
  await page.waitForLoadState("networkidle");
}

async function expectUserToBeAMemberOfOrganization({
  page,
  username,
  email,
  role,
  isMemberShipAccepted,
}: {
  page: Page;
  username: string;
  role: string;
  isMemberShipAccepted: boolean;
  email: string;
}) {
  // Check newly invited member is not pending anymore
  await page.goto("/settings/organizations/members");
  expect(await page.locator(`[data-testid="member-${username}-username"]`).textContent()).toBe(username);
  expect(await page.locator(`[data-testid="member-${username}-email"]`).textContent()).toBe(email);
  expect((await page.locator(`[data-testid="member-${username}-role"]`).textContent())?.toLowerCase()).toBe(
    role.toLowerCase()
  );
  if (isMemberShipAccepted) {
    await expect(page.locator(`[data-testid2="member-${username}-pending"]`)).toBeHidden();
  } else {
    await expect(page.locator(`[data-testid2="member-${username}-pending"]`)).toBeVisible();
  }
}

async function expectUserToBeAMemberOfTeam({
  page,
  teamId,
  email,
  role,
  username,
  isMemberShipAccepted,
}: {
  page: Page;
  username: string;
  role: string;
  teamId: number;
  isMemberShipAccepted: boolean;
  email: string;
}) {
  // Check newly invited member is not pending anymore
  await page.goto(`/settings/teams/${teamId}/members`);
  await page.reload();
  expect(
    (
      await page.locator(`[data-testid="member-${username}"] [data-testid=member-role]`).textContent()
    )?.toLowerCase()
  ).toBe(role.toLowerCase());
  if (isMemberShipAccepted) {
    await expect(page.locator(`[data-testid="email-${email.replace("@", "")}-pending"]`)).toBeHidden();
  } else {
    await expect(page.locator(`[data-testid="email-${email.replace("@", "")}-pending"]`)).toBeVisible();
  }
}

function assertInviteLink(inviteLink: string | null | undefined): asserts inviteLink is string {
  if (!inviteLink) throw new Error("Invite link not found");
}

async function copyInviteLink(page: Page) {
  await page.locator('button:text("Add")').click();
  await page.locator(`[data-testid="copy-invite-link-button"]`).click();
  const inviteLink = await getInviteLink(page);
  return inviteLink;
}
