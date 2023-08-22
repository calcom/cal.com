import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth, testName, todo } from "./lib/testUtils";

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
    const { team } = await owner.getTeam();
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

    const { team } = await owner.getTeam();
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
    expect(teamMatesObj.some(({ name }) => name === chosenUser)).toBe(true);
    // TODO: Assert whether the user received an email
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

  todo("Create a Round Robin with different leastRecentlyBooked hosts");
  todo("Reschedule a Collective EventType booking");
  todo("Reschedule a Round Robin EventType booking");
});
