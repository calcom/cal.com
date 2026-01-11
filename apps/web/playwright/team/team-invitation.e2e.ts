import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";
import { localize } from "../lib/localize";
import { getInviteLink } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Team", () => {
  test("Invitation (non verified)", async ({ browser, page, users, emails }) => {
    const t = await localize("en");
    const teamOwner = await users.create(undefined, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeamMembership();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/settings`);

    await test.step("To the team by email (external user)", async () => {
      const invitedUserEmail = users.trackEmail({
        username: "rick",
        domain: `domain-${Date.now()}.com`,
      });
      await page.goto(`/settings/teams/${team.id}/members`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500); // Add a small delay to ensure UI is fully loaded
      await page.getByTestId("new-member-button").click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.getByText(t("send_invite")).click();
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

      expect(inviteLink).toBeTruthy();

      // Follow invite link to new window
      const context = await browser.newContext();
      const newPage = await context.newPage();
      await newPage.goto(inviteLink);
      await expect(newPage.locator("text=Create your account")).toBeVisible();

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
      await page.goto(`/settings/teams/${team.id}/settings`);
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(0);
    });

    await test.step("To the team by invite link", async () => {
      const user = await users.create({
        email: `user-invite-${Date.now()}@domain.com`,
        password: "P4ssw0rd!",
      });

      await page.goto(`/settings/teams/${team.id}/members`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500); // Add a small delay to ensure UI is fully loaded
      await page.getByTestId("new-member-button").click();
      const inviteLink = await getInviteLink(page);

      const context = await browser.newContext();
      const inviteLinkPage = await context.newPage();
      await inviteLinkPage.goto(inviteLink);
      await inviteLinkPage.waitForTimeout(3000);

      await inviteLinkPage.locator("button[type=submit]").click();
      await expect(inviteLinkPage.locator('[data-testid="field-error"]')).toHaveCount(2);

      await inviteLinkPage.locator("input[name=email]").fill(user.email);
      await inviteLinkPage.locator("input[name=password]").fill(user.username || "P4ssw0rd!");
      await inviteLinkPage.locator("button[type=submit]").click();

      await inviteLinkPage.waitForURL(`${WEBAPP_URL}/teams**`);
    });
  });

  test("Invitation (verified)", async ({ page, users, emails }) => {
    const t = await localize("en");
    const teamOwner = await users.create({ name: `team-owner-${Date.now()}` }, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeamMembership();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/settings`);

    await test.step("To the organization by email (internal user)", async () => {
      const invitedUserEmail = users.trackEmail({
        username: "rick",
        domain: `example.com`,
      });
      await page.goto(`/settings/teams/${team.id}/members`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500); // Add a small delay to ensure UI is fully loaded
      await page.getByTestId("new-member-button").click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.getByText(t("send_invite")).click();
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

  test("Invited member is assigned to existing managed event, after invitation is accepted", async ({
    page,
    users,
  }) => {
    const t = await localize("en");
    const teamEventSlugAndTitle = "managed-event-test";
    const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];
    const teamOwner = await users.create(
      { name: `team-owner-${Date.now()}` },
      {
        hasTeam: true,
        teamRole: MembershipRole.ADMIN,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.MANAGED,
        teamEventSlug: teamEventSlugAndTitle,
        teamEventTitle: teamEventSlugAndTitle,
        teamEventLength: 30,
        addManagedEventToTeamMates: true,
        assignAllTeamMembers: true,
      }
    );
    const invitedMember = await users.create({
      name: `invited-member-${Date.now()}`,
      email: `invited-member-${Date.now()}@example.com`,
    });
    const { team } = await teamOwner.getFirstTeamMembership();

    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/settings`);
    await page.goto(`/settings/teams/${team.id}/members`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500); // Add a small delay to ensure UI is fully loaded
    await page.getByTestId("new-member-button").click();
    await page.locator('input[name="inviteUser"]').fill(invitedMember.email);
    await page.getByText(t("send_invite")).click();

    await invitedMember.apiLogin();
    await page.goto(`/teams`);
    await page.getByTestId(`accept-invitation-${team.id}`).click();
    const response = await page.waitForResponse("/api/trpc/teams/acceptOrLeave?batch=1");
    expect(response.status()).toBe(200);
    await page.goto(`/event-types`);

    //ensure managed event-type is created for the invited member
    await expect(page.locator(`text="${teamEventSlugAndTitle}"`)).toBeVisible();

    //ensure the new event-type created for invited member is child of team event-type
    const parentEventType = await prisma.eventType.findFirst({
      where: {
        slug: teamEventSlugAndTitle,
        teamId: team.id,
      },
      select: {
        children: true,
      },
    });
    expect(parentEventType?.children.find((et) => et.userId === invitedMember.id)).toBeTruthy();
  });

  test("Auto-accept invitation for existing user", async ({ browser, page, users, emails }) => {
    const t = await localize("en");
    const teamOwner = await users.create({ name: "Invited User" }, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeamMembership();
    const invitedUser = await users.create({
      email: `invited-user-${Date.now()}@example.com`,
      name: "Invited User",
    });

    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);

    let inviteLink: string;

    await test.step("Send invitation to existing user", async () => {
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await page.getByTestId("new-member-button").click();
      await page.locator('input[name="inviteUser"]').fill(invitedUser.email);
      await page.getByText(t("send_invite")).click();

      inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUser.email,
        `${teamOwner.name} invited you to join the team ${team.name} on Cal.com`,
        "teams?token"
      );

      expect(inviteLink).toContain("autoAccept=true");

      const membership = await prisma.membership.findFirst({
        where: {
          userId: invitedUser.id,
          teamId: team.id,
        },
      });
      expect(membership?.accepted).toBe(false);
    });

    await test.step("Auto-accept invitation by clicking link", async () => {
      const [secondContext, secondPage] = await invitedUser.apiLoginOnNewBrowser(browser);

      await secondPage.goto(inviteLink);

      await expect(secondPage.getByText("Successfully joined")).toBeVisible();

      const membership = await prisma.membership.findFirst({
        where: {
          userId: invitedUser.id,
          teamId: team.id,
        },
      });
      expect(membership?.accepted).toBe(true);

      await secondPage.close();
      await secondContext.close();
    });
  });

  test("Error when wrong user tries to use invitation link", async ({ browser, page, users, emails }) => {
    const t = await localize("en");
    const teamOwner = await users.create({ name: "Wrong User" }, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeamMembership();
    const invitedUser = await users.create({
      email: `invited-user-${Date.now()}@example.com`,
      name: "Invited User",
    });
    const wrongUser = await users.create({
      email: `wrong-user-${Date.now()}@example.com`,
      name: "Wrong User",
    });

    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);

    let inviteLink: string;

    await test.step("Send invitation to specific user", async () => {
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await page.getByTestId("new-member-button").click();
      await page.locator('input[name="inviteUser"]').fill(invitedUser.email);
      await page.getByText(t("send_invite")).click();

      inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUser.email,
        `${teamOwner.name} invited you to join the team ${team.name} on Cal.com`,
        "teams?token"
      );

      expect(inviteLink).toContain("autoAccept=true");
    });

    await test.step("Wrong user tries to use invitation link", async () => {
      const [secondContext, secondPage] = await wrongUser.apiLoginOnNewBrowser(browser);

      await secondPage.goto(inviteLink);

      await expect(secondPage.getByText("This invitation is not for your account")).toBeVisible();

      const membership = await prisma.membership.findFirst({
        where: {
          userId: wrongUser.id,
          teamId: team.id,
        },
      });
      expect(membership).toBeNull();

      const invitedMembership = await prisma.membership.findFirst({
        where: {
          userId: invitedUser.id,
          teamId: team.id,
        },
      });
      expect(invitedMembership?.accepted).toBe(false);

      await secondPage.close();
      await secondContext.close();
    });
  });
});
