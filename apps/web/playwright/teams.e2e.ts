import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth, testName } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Teams", () => {
  test("Can create teams via Wizard", async ({ page, users }) => {
    const user = await users.create();
    const inviteeEmail = `${user.username}+invitee@example.com`;
    await user.apiLogin();
    await page.goto("/teams");

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
      await expect(page.locator(`li:has-text("${inviteeEmail}")`)).toBeVisible();
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
    });

    await test.step("Can disband team", async () => {
      await page.locator("text=Disband Team").click();
      await page.locator("text=Yes, disband team").click();
      await page.waitForURL("/teams");
      await expect(await page.locator(`text=${user.username}'s Team`).count()).toEqual(0);
      // FLAKY: If other tests are running async this may mean there are >0 teams, empty screen will not be shown.
      // await expect(page.locator('[data-testid="empty-screen"]')).toBeVisible();
    });
  });
  test("Can create a booking for Collective EventType", async ({ page, users }) => {
    const ownerObj = { username: "pro-user", name: "pro-user" };
    const teamMate1Obj = { username: "teammate-1", name: "teammate-1" };
    const teamMate2Obj = { username: "teammate-2", name: "teammate-2" };

    const owner = await users.create(ownerObj, { hasTeam: true });
    const teamMate1 = await users.create(teamMate1Obj);
    const teamMate2 = await users.create(teamMate2Obj);
    teamMate1.username, teamMate2.username;
    // TODO: Create a fixture and follow DRY
    const { team } = await prisma.membership.findFirstOrThrow({
      where: { userId: owner.id },
      include: { team: true },
    });

    // Add teamMate1 to the team
    await prisma.membership.create({
      data: {
        teamId: team.id,
        userId: teamMate1.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });

    // Add teamMate2 to the team
    await prisma.membership.create({
      data: {
        teamId: team.id,
        userId: teamMate2.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
    // No need to remove membership row manually as it will be deleted with the user, at the end of the test.

    const { id: eventTypeId } = await prisma.eventType.findFirstOrThrow({
      where: { userId: owner.id, teamId: team.id },
      select: { id: true },
    });

    // Assign owner and teammates to the eventtype host list
    await prisma.host.create({
      data: {
        userId: owner.id,
        eventTypeId,
        isFixed: true,
      },
    });
    await prisma.host.create({
      data: {
        userId: teamMate1.id,
        eventTypeId,
        isFixed: true,
      },
    });
    await prisma.host.create({
      data: {
        userId: teamMate2.id,
        eventTypeId,
        isFixed: true,
      },
    });

    await page.goto(`/team/${team.slug}/team-event-30min`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    // The first user added to the host list will be the host name
    await expect(page.locator(`[data-testid="host-name-${ownerObj.name}"]`)).toHaveText(ownerObj.name);

    // The remaining hosts will be shown as the attendees
    await expect(page.locator(`[data-testid="attendee-name-${teamMate1Obj.name}"]`)).toHaveText(
      teamMate1Obj.name
    );
    await expect(page.locator(`[data-testid="attendee-name-${teamMate2Obj.name}"]`)).toHaveText(
      teamMate2Obj.name
    );
    // TODO: Assert whether the user received an email
  });
});
