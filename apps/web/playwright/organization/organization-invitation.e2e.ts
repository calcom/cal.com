import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";
import { moveUserToOrg } from "../lib/orgMigration";
import { bookTeamEvent, doOnOrgDomain, expectPageToBeNotFound, getInviteLink } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, orgs }) => {
  await users.deleteAll();
  await orgs.deleteAll();
});

test.describe("Organization", () => {
  test.describe("Email not matching orgAutoAcceptEmail", () => {
    test("nonexisting user invited to an organization", async ({ browser, page, users, emails }) => {
      const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true });
      const { team: org } = await orgOwner.getOrgMembership();
      await orgOwner.apiLogin();
      await page.goto(`/settings/organizations/${org.slug}/members`);

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
          orgSlug: org.slug,
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
          orgSlug: org.slug,
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
          orgSlug: org.slug,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email,
        });
      });
    });

    // This test is already covered by booking.e2e.ts where existing user is invited and his booking links are tested.
    // We can re-test here when we want to test some more scenarios.

    test("existing user invited to an organization", () => {});

    test("nonexisting user invited to a Team inside organization", async ({
      browser,
      page,
      users,
      emails,
    }) => {
      const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true, hasSubteam: true });
      await orgOwner.apiLogin();
      const { team } = await orgOwner.getFirstTeamMembership();
      const { team: org } = await orgOwner.getOrgMembership();

      await test.step("By email", async () => {
        await page.goto(`/settings/teams/${team.id}/settings`);
        const invitedUserEmail = users.trackEmail({ username: "rick", domain: "domain.com" });
        // '-domain' because the email doesn't match orgAutoAcceptEmail
        const usernameDerivedFromEmail = `${invitedUserEmail.split("@")[0]}-domain`;
        await inviteAnEmail(page, invitedUserEmail, true);
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
          orgSlug: org.slug,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: false,
          email: invitedUserEmail,
        });

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
          orgSlug: org.slug,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });
      });

      await test.step("By invite link", async () => {
        await page.goto(`/settings/teams/${team.id}/settings`);
        const inviteLink = await copyInviteLink(page, true);
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
          orgSlug: org.slug,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: email,
        });
      });
    });
  });

  test.describe("Email matching orgAutoAcceptEmail and a Verified Organization with DNS Setup Done", () => {
    test("nonexisting user is invited to Org", async ({ browser, page, users, emails }) => {
      const orgOwner = await users.create(undefined, {
        hasTeam: true,
        isOrg: true,
        isOrgVerified: true,
        isDnsSetup: true,
      });
      const { team: org } = await orgOwner.getOrgMembership();
      await orgOwner.apiLogin();
      await page.goto(`/settings/organizations/${org.slug}/members`);

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
          orgSlug: org.slug,
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
          orgSlug: org.slug,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email,
        });
      });
    });

    // Such a user has user.username changed directly in addition to having the new username in the profile.username
    test("existing user migrated to an organization", async ({ users, page, emails: _emails }) => {
      const orgOwner = await users.create(undefined, {
        hasTeam: true,
        isOrg: true,
        isOrgVerified: true,
        isDnsSetup: true,
      });
      const { team: org } = await orgOwner.getOrgMembership();
      await orgOwner.apiLogin();
      const { existingUser } = await test.step("Invite an existing user to an organization", async () => {
        const existingUser = await users.create({
          username: "john",
          emailDomain: org.organizationSettings?.orgAutoAcceptEmail ?? "",
          name: "John Outside Organization",
        });

        await moveUserToOrg({
          user: existingUser,
          targetOrg: {
            username: `${existingUser.username}-org`,
            id: org.id,
            membership: {
              role: MembershipRole.MEMBER,
              accepted: true,
            },
          },
          shouldMoveTeams: false,
        });
        return { existingUser };
      });

      await test.step("Signing up with the previous username of the migrated user - shouldn't be allowed", async () => {
        await orgOwner.logout();
        await page.goto("/");
        await page.waitForLoadState();
        await page.goto("/signup");
        await expect(page.locator("text=Create your account")).toBeVisible();
        await expect(page.locator('[data-testid="continue-with-email-button"]')).toBeVisible();
        await page.locator('[data-testid="continue-with-email-button"]').click();
        await expect(page.locator('[data-testid="signup-submit-button"]')).toBeVisible();

        await page.locator('input[name="username"]').fill(existingUser.username!);
        await page
          .locator('input[name="email"]')
          .fill(`${existingUser.username}-differnet-email@example.com`);
        await page.locator('input[name="password"]').fill("Password99!");
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
      });
    });

    test("nonexisting user is invited to a team inside organization", async ({
      browser,
      page,
      users,
      emails,
    }) => {
      const orgOwner = await users.create(undefined, {
        hasTeam: true,
        isOrg: true,
        hasSubteam: true,
        isOrgVerified: true,
        isDnsSetup: true,
      });
      const { team: org } = await orgOwner.getOrgMembership();
      const { team } = await orgOwner.getFirstTeamMembership();

      await orgOwner.apiLogin();

      await test.step("By email", async () => {
        await page.goto(`/settings/teams/${team.id}/settings`);
        const invitedUserEmail = users.trackEmail({ username: "rick", domain: "example.com" });
        const usernameDerivedFromEmail = invitedUserEmail.split("@")[0];
        await inviteAnEmail(page, invitedUserEmail, true);

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
          orgSlug: org.slug,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: invitedUserEmail,
        });
      });

      await test.step("By invite link", async () => {
        await page.goto(`/settings/teams/${team.id}/settings`);

        const inviteLink = await copyInviteLink(page, true);
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
          orgSlug: org.slug,
          username: usernameDerivedFromEmail,
          role: "member",
          isMemberShipAccepted: true,
          email: email,
        });
      });
    });

    test("can book an event with auto accepted invitee (not completed on-boarding) added as fixed host.", async ({
      page,
      users,
    }) => {
      const orgOwner = await users.create(undefined, {
        hasTeam: true,
        isOrg: true,
        hasSubteam: true,
        isOrgVerified: true,
        isDnsSetup: true,
        orgRequestedSlug: "example",
        schedulingType: SchedulingType.ROUND_ROBIN,
      });
      const { team: org } = await orgOwner.getOrgMembership();
      const { team } = await orgOwner.getFirstTeamMembership();

      await orgOwner.apiLogin();
      await page.goto(`/settings/teams/${team.id}/settings`);
      const invitedUserEmail = users.trackEmail({ username: "rick", domain: "example.com" });
      await inviteAnEmail(page, invitedUserEmail, true);

      //add invitee as fixed host to team event
      const teamEvent = await orgOwner.getFirstTeamEvent(team.id);
      await page.goto(`/event-types/${teamEvent.id}?tabName=team`);
      await page.locator('[data-testid="fixed-hosts-switch"]').click();
      await page.locator('[data-testid="fixed-hosts-select"]').click();
      await page.locator(`text="${invitedUserEmail}"`).click();
      await page.locator('[data-testid="update-eventtype"]').click();
      await page.waitForResponse("/api/trpc/eventTypesHeavy/update?batch=1");

      await expectPageToBeNotFound({ page, url: `/team/${team.slug}/${teamEvent.slug}` });
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/team/${team.slug}/${teamEvent.slug}`);
          await bookTeamEvent({ page, team, event: teamEvent });
          await expect(page.getByText(invitedUserEmail, { exact: true })).toBeVisible();
          return { url: result.url };
        }
      );
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
  await expect(inviteLinkPage.locator("text=Create your account")).toBeVisible();

  // Check required fields
  const button = inviteLinkPage.locator("button[type=submit][disabled]");
  await expect(button).toBeVisible(); // email + 3 password hints

  await inviteLinkPage.locator("input[name=email]").fill(email);
  await inviteLinkPage.locator("input[name=password]").fill(`P4ssw0rd!`);
  await inviteLinkPage.locator("button[type=submit]").click();
  await inviteLinkPage.waitForURL("/getting-started");
  return { email };
}

export async function signupFromEmailInviteLink({
  browser,
  inviteLink,
  expectedUsername,
  expectedEmail,
}: {
  browser: Browser;
  inviteLink: string;
  expectedUsername?: string;
  expectedEmail?: string;
}) {
  // Follow invite link in new window
  const context = await browser.newContext();
  const signupPage = await context.newPage();

  signupPage.goto(inviteLink);
  await expect(signupPage.locator("text=Create your account")).toBeVisible();
  await expect(signupPage.locator(`[data-testid="signup-usernamefield"]`)).toBeDisabled();
  // await for value. initial value is ""
  if (expectedUsername) {
    await expect(signupPage.locator(`[data-testid="signup-usernamefield"]`)).toHaveValue(expectedUsername);
  }

  await expect(signupPage.locator(`[data-testid="signup-emailfield"]`)).toBeDisabled();
  if (expectedEmail) {
    await expect(signupPage.locator(`[data-testid="signup-emailfield"]`)).toHaveValue(expectedEmail);
  }

  // Check required fields
  await signupPage.locator("input[name=password]").fill(`P4ssw0rd!`);
  await signupPage.locator("button[type=submit]").click();
  await signupPage.waitForURL("/getting-started?from=signup");
  await context.close();
  await signupPage.close();
}

async function inviteAnEmail(page: Page, invitedUserEmail: string, teamPage?: boolean) {
  if (teamPage) {
    const url = page.url();
    const teamIdMatch = url.match(/\/settings\/teams\/(\d+)/);
    if (teamIdMatch && teamIdMatch[1]) {
      await page.goto(`/settings/teams/${teamIdMatch[1]}/members`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500); // Add a small delay to ensure UI is fully loaded
    }
    await page.getByTestId("new-member-button").click();
  } else {
    await page.getByTestId("new-organization-member-button").click();
  }
  await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
  const submitPromise = page.waitForResponse("/api/trpc/teams/inviteMember?batch=1");
  await page.getByTestId("invite-new-member-button").click();
  const response = await submitPromise;
  expect(response.status()).toBe(200);
}

async function expectUserToBeAMemberOfOrganization({
  page,
  orgSlug,
  username,
  email,
  role,
  isMemberShipAccepted,
}: {
  page: Page;
  orgSlug: string | null;
  username: string;
  role: string;
  isMemberShipAccepted: boolean;
  email: string;
}) {
  // Check newly invited member is not pending anymore
  await page.goto(`/settings/organizations/${orgSlug}/members`);
  await expect(page.locator(`[data-testid="member-${username}-username"]`)).toHaveText(username);
  await expect(page.locator(`[data-testid="member-${username}-email"]`)).toHaveText(email);
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
  role: _role,
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
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000); // Add a small delay to ensure UI is fully loaded
  expect(
    (
      await page
        .locator(
          `[data-testid="member-${username}"] [data-testid="${
            isMemberShipAccepted ? "member-email" : `email-${email.replace("@", "")}-pending`
          }"]`
        )
        .textContent()
    )?.toLowerCase()
  ).toBe(email.toLowerCase());
  if (isMemberShipAccepted) {
    await expect(page.locator(`[data-testid="email-${email.replace("@", "")}-pending"]`)).toBeHidden();
  } else {
    await expect(page.locator(`[data-testid="email-${email.replace("@", "")}-pending"]`)).toBeVisible();
  }
}

function assertInviteLink(inviteLink: string | null | undefined): asserts inviteLink is string {
  if (!inviteLink) throw new Error("Invite link not found");
}

async function copyInviteLink(page: Page, teamPage?: boolean) {
  if (teamPage) {
    const url = page.url();
    const teamIdMatch = url.match(/\/settings\/teams\/(\d+)/);
    if (teamIdMatch && teamIdMatch[1]) {
      await page.goto(`/settings/teams/${teamIdMatch[1]}/members`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500); // Add a small delay to ensure UI is fully loaded
    }
    await page.getByTestId("new-member-button").click();
  } else {
    await page.getByTestId("new-organization-member-button").click();
  }
  const inviteLink = await getInviteLink(page);
  return inviteLink;
}
