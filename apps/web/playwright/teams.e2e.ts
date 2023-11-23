import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth, testName, todo } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Teams - NonOrg", () => {
  test.afterEach(({ users }) => users.deleteAll());
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
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(ownerObj, {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    const { team } = await owner.getFirstTeam();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    await page.goto(`/team/${team.slug}/${teamEventSlug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // The title of the booking
    const BookingTitle = `${teamEventTitle} between ${team.name} and ${testName}`;
    await expect(page.locator("[data-testid=booking-title]")).toHaveText(BookingTitle);
    // The booker should be in the attendee list
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    // All the teammates should be in the booking
    for (const teammate of teamMatesObj) {
      await expect(page.getByText(teammate.name, { exact: true })).toBeVisible();
    }

    // TODO: Assert whether the user received an email
  });

  test("Can create a booking for Round Robin EventType", async ({ page, users }) => {
    const ownerObj = { username: "pro-user", name: "pro-user" };
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];
    const owner = await users.create(ownerObj, {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    const { team } = await owner.getFirstTeam();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    await page.goto(`/team/${team.slug}/${teamEventSlug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // The person who booked the meeting should be in the attendee list
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    // The title of the booking
    const BookingTitle = `${teamEventTitle} between ${team.name} and ${testName}`;
    await expect(page.locator("[data-testid=booking-title]")).toHaveText(BookingTitle);

    // Since all the users have the same leastRecentlyBooked value
    // Anyone of the teammates could be the Host of the booking.
    const chosenUser = await page.getByTestId("booking-host-name").textContent();
    expect(chosenUser).not.toBeNull();
    expect(teamMatesObj.concat([{ name: ownerObj.name }]).some(({ name }) => name === chosenUser)).toBe(true);
    // TODO: Assert whether the user received an email
  });

  test("Non admin team members cannot create team in org", async ({ page, users }) => {
    const teamMateName = "teammate-1";

    const owner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      teammates: [{ name: teamMateName }],
    });

    const allUsers = await users.get();
    const memberUser = allUsers.find((user) => user.name === teamMateName);

    // eslint-disable-next-line playwright/no-conditional-in-test
    if (memberUser) {
      await memberUser.apiLogin();

      await page.goto("/teams");
      await expect(page.locator("[data-testid=new-team-btn]")).toBeHidden();
      await expect(page.locator("[data-testid=create-team-btn]")).toHaveAttribute("disabled", "");

      const uniqueName = "test-unique-team-name";

      // Go directly to the create team page
      await page.goto("/settings/teams/new");
      // Fill input[name="name"]
      await page.locator('input[name="name"]').fill(uniqueName);
      await page.locator("text=Continue").click();
      await expect(page.locator("[data-testid=alert]")).toBeVisible();

      // cleanup
      const org = await owner.getOrg();
      await prisma.team.delete({ where: { id: org.teamId } });
    }
  });

  test("Can create team with same name as user", async ({ page, users }) => {
    // Name to be used for both user and team
    const uniqueName = "test-unique-name";
    const ownerObj = { username: uniqueName, name: uniqueName, useExactUsername: true };

    const user = await users.create(ownerObj);
    await user.apiLogin();
    await page.goto("/teams");

    await test.step("Can create team with same name", async () => {
      // Click text=Create Team
      await page.locator("text=Create Team").click();
      await page.waitForURL("/settings/teams/new");
      // Fill input[name="name"]
      await page.locator('input[name="name"]').fill(uniqueName);
      // Click text=Continue
      await page.locator("text=Continue").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members$/i);
      // Click text=Continue
      await page.locator("text=Publish team").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/profile$/i);
    });

    await test.step("Can access user and team with same slug", async () => {
      // Go to team page and confirm name
      const teamUrl = `/team/${uniqueName}`;
      await page.goto(teamUrl);
      await page.waitForURL(teamUrl);
      await expect(page.locator("[data-testid=team-name]")).toHaveText(uniqueName);

      // Go to user page and confirm name
      const userUrl = `/${uniqueName}`;
      await page.goto(userUrl);
      await page.waitForURL(userUrl);
      await expect(page.locator("[data-testid=name-title]")).toHaveText(uniqueName);

      // cleanup team
      const team = await prisma.team.findFirst({ where: { slug: uniqueName } });
      await prisma.team.delete({ where: { id: team?.id } });
    });
  });

  test("Can create a private team", async ({ page, users }) => {
    const ownerObj = { username: "pro-user", name: "pro-user" };
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(ownerObj, {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.COLLECTIVE,
    });

    await owner.apiLogin();
    const { team } = await owner.getFirstTeam();

    // Mark team as private
    await page.goto(`/settings/teams/${team.id}/members`);
    await page.click("[data-testid=make-team-private-check]");
    await expect(page.locator(`[data-testid=make-team-private-check][data-state="checked"]`)).toBeVisible();

    // Go to Team's page
    await page.goto(`/team/${team.slug}`);
    await expect(page.locator('[data-testid="book-a-team-member-btn"]')).toBeHidden();

    // Go to members page
    await page.goto(`/team/${team.slug}?members=1`);
    await expect(page.locator('[data-testid="you-cannot-see-team-members"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-members-container"]')).toBeHidden();
  });

  todo("Create a Round Robin with different leastRecentlyBooked hosts");
  todo("Reschedule a Collective EventType booking");
  todo("Reschedule a Round Robin EventType booking");
});

test.describe("Teams - Org", () => {
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
      await page.waitForURL((url) => url.pathname === "/settings/teams/new");
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
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(2);

      const lastRemoveMemberButton = page.locator('[data-testid="remove-member-button"]').last();
      await lastRemoveMemberButton.click();
      await page.waitForLoadState("networkidle");
      expect(await page.locator('[data-testid="pending-member-item"]').count()).toBe(1);

      // Cleanup here since this user is created without our fixtures.
      await prisma.user.delete({ where: { email: inviteeEmail } });
    });

    await test.step("Can finish team creation", async () => {
      await page.locator("text=Finish").click();
      await page.waitForURL("/settings/teams");
    });

    await test.step("Can disband team", async () => {
      await page.locator('[data-testid="team-list-item-link"]').click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/profile$/i);
      await page.locator("text=Disband Team").click();
      await page.locator("text=Yes, disband team").click();
      await page.waitForURL("/teams");
      expect(await page.locator(`text=${user.username}'s Team`).count()).toEqual(0);
    });
  });

  test("Can create a booking for Collective EventType", async ({ page, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
    });
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      {
        username: "pro-user",
        name: "pro-user",
        organizationId: org.id,
        roleInOrganization: MembershipRole.MEMBER,
      },
      {
        hasTeam: true,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );
    const { team } = await owner.getFirstTeam();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    await page.goto(`/team/${team.slug}/${teamEventSlug}`);

    await expect(page.locator("text=This page could not be found")).toBeVisible();
    await doOnOrgDomain(
      {
        orgSlug: org.slug,
        page,
      },
      async () => {
        await page.goto(`/team/${team.slug}/${teamEventSlug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.locator("[data-testid=success-page]")).toBeVisible();

        // The title of the booking
        const BookingTitle = `${teamEventTitle} between ${team.name} and ${testName}`;
        await expect(page.locator("[data-testid=booking-title]")).toHaveText(BookingTitle);
        // The booker should be in the attendee list
        await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

        // All the teammates should be in the booking
        for (const teammate of teamMatesObj.concat([{ name: owner.name || "" }])) {
          await expect(page.getByText(teammate.name, { exact: true })).toBeVisible();
        }
      }
    );

    // TODO: Assert whether the user received an email
  });

  test("Can create a booking for Round Robin EventType", async ({ page, users }) => {
    const ownerObj = { username: "pro-user", name: "pro-user" };
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];
    const owner = await users.create(ownerObj, {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    const { team } = await owner.getFirstTeam();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    await page.goto(`/team/${team.slug}/${teamEventSlug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // The person who booked the meeting should be in the attendee list
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    // The title of the booking
    const BookingTitle = `${teamEventTitle} between ${team.name} and ${testName}`;
    await expect(page.locator("[data-testid=booking-title]")).toHaveText(BookingTitle);

    // Since all the users have the same leastRecentlyBooked value
    // Anyone of the teammates could be the Host of the booking.
    const chosenUser = await page.getByTestId("booking-host-name").textContent();
    expect(chosenUser).not.toBeNull();
    expect(teamMatesObj.concat([{ name: ownerObj.name }]).some(({ name }) => name === chosenUser)).toBe(true);
    // TODO: Assert whether the user received an email
  });
});

async function doOnOrgDomain(
  { orgSlug, page }: { orgSlug: string | null; page: Page },
  callback: ({ page }: { page: Page }) => Promise<void>
) {
  if (!orgSlug) {
    throw new Error("orgSlug is not available");
  }
  page.setExtraHTTPHeaders({
    "x-cal-force-slug": orgSlug,
  });
  await callback({ page });
}
