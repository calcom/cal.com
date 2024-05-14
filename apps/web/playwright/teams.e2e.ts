import { expect } from "@playwright/test";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { testBothFutureAndLegacyRoutes } from "./lib/future-legacy-routes";
import {
  bookTimeSlot,
  fillStripeTestCheckout,
  selectFirstAvailableTimeSlotNextMonth,
  testName,
  todo,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

testBothFutureAndLegacyRoutes.describe("Teams A/B tests", (routeVariant) => {
  test("should render the /teams page", async ({ page, users, context }) => {
    // TODO: Revert until OOM issue is resolved
    test.skip(routeVariant === "future", "Future route not ready yet");
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/teams");

    await page.waitForLoadState();

    const locator = page.getByRole("heading", { name: "Teams", exact: true });

    await expect(locator).toBeVisible();
  });
});

testBothFutureAndLegacyRoutes.describe("Teams - NonOrg", (routeVariant) => {
  test.afterEach(({ users }) => users.deleteAll());

  test("Team Onboarding Invite Members", async ({ page, users }) => {
    const user = await users.create(undefined, { hasTeam: true });
    const { team } = await user.getFirstTeamMembership();
    const inviteeEmail = `${user.username}+invitee@example.com`;

    await user.apiLogin();

    page.goto(`/settings/teams/${team.id}/onboard-members`);

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

    await test.step("Finishing brings you to team profile page", async () => {
      await page.locator("[data-testid=publish-button]").click();
      await expect(page).toHaveURL(/\/settings\/teams\/(\d+)\/profile$/i);
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
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );
    const { team } = await owner.getFirstTeamMembership();
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
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];
    const owner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.ROUND_ROBIN,
      }
    );

    const { team } = await owner.getFirstTeamMembership();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    await page.goto(`/team/${team.slug}/${teamEventSlug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // The person who booked the meeting should be in the attendee list
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    // The title of the booking
    const bookingTitle = await page.getByTestId("booking-title").textContent();
    expect(
      teamMatesObj?.some((teamMate) => {
        const BookingTitle = `${teamEventTitle} between ${teamMate.name} and ${testName}`;
        return BookingTitle === bookingTitle;
      })
    ).toBe(true);

    // Since all the users have the same leastRecentlyBooked value
    // Anyone of the teammates could be the Host of the booking.
    const chosenUser = await page.getByTestId("booking-host-name").textContent();
    expect(chosenUser).not.toBeNull();
    expect(teamMatesObj.concat([{ name: owner.name! }]).some(({ name }) => name === chosenUser)).toBe(true);
    // TODO: Assert whether the user received an email
  });

  test("Non admin team members cannot create team in org", async ({ page, users }) => {
    test.skip(routeVariant === "future", "Future route not ready yet");
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
      await page.click("[type=submit]");

      // cleanup
      const org = await owner.getOrgMembership();
      await prisma.team.delete({ where: { id: org.teamId } });
    }
  });

  test("Can create team with same name as user", async ({ page, users }) => {
    test.skip(routeVariant === "future", "Future route not ready yet");
    const user = await users.create();
    // Name to be used for both user and team
    const uniqueName = user.username!;
    await user.apiLogin();
    await page.goto("/teams");

    await test.step("Can create team with same name", async () => {
      // Click text=Create Team
      await page.locator("text=Create Team").click();
      await page.waitForURL("/settings/teams/new");
      // Fill input[name="name"]
      await page.locator('input[name="name"]').fill(uniqueName);
      // Click text=Continue
      await page.click("[type=submit]");
      // TODO: Figure out a way to make this more reliable
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (IS_TEAM_BILLING_ENABLED) await fillStripeTestCheckout(page);
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members.*$/i);
      // Click text=Continue
      await page.locator("[data-testid=publish-button]").click();
      await expect(page).toHaveURL(/\/settings\/teams\/(\d+)\/profile$/i);
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
      await prisma.team.deleteMany({ where: { slug: uniqueName } });
    });
  });

  test("Can create a private team", async ({ page, users }) => {
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );

    await owner.apiLogin();
    const { team } = await owner.getFirstTeamMembership();

    // Mark team as private
    await page.goto(`/settings/teams/${team.id}/members`);
    await Promise.all([
      page.click("[data-testid=make-team-private-check]"),
      expect(page.locator(`[data-testid=make-team-private-check][data-state="checked"]`)).toBeVisible(),
      // according to switch implementation, checked state can be set before mutation is resolved
      // so we need to await for req to resolve
      page.waitForResponse((res) => res.url().includes("/api/trpc/teams/update")),
    ]);

    // Go to Team's page
    await page.goto(`/team/${team.slug}`);
    await expect(page.locator('[data-testid="book-a-team-member-btn"]')).toBeHidden();

    // Go to members page
    await page.goto(`/team/${team.slug}?members=1`);
    await expect(page.locator('[data-testid="you-cannot-see-team-members"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-members-container"]')).toBeHidden();
  });
  test("Email Embeds slots are loading for team event types", async ({ page, users }) => {
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );

    await owner.apiLogin();
    const { team } = await owner.getFirstTeamMembership();
    const {
      title: teamEventTitle,
      slug: teamEventSlug,
      id: teamEventId,
    } = await owner.getFirstTeamEvent(team.id);

    await page.goto("/event-types");

    await page.getByTestId(`event-type-options-${teamEventId}`).first().click();
    await page.getByTestId("embed").click();
    await page.getByTestId("email").click();
    await page.getByTestId("incrementMonth").click();

    await expect(page.getByTestId("no-slots-available")).toBeHidden();

    // Check Team Url
    const availableTimesUrl = await page.getByTestId("see_all_available_times").getAttribute("href");
    await expect(availableTimesUrl).toContain(`/team/${team.slug}/${teamEventSlug}`);
  });

  todo("Create a Round Robin with different leastRecentlyBooked hosts");
  todo("Reschedule a Collective EventType booking");
  todo("Reschedule a Round Robin EventType booking");
});
