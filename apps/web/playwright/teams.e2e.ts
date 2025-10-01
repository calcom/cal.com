import { expect } from "@playwright/test";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { test, todo } from "./lib/fixtures";
import {
  bookTimeSlot,
  confirmReschedule,
  fillStripeTestCheckout,
  selectFirstAvailableTimeSlotNextMonth,
  submitAndWaitForResponse,
  testName,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Teams tests", () => {
  test("should render the /teams page", async ({ page, users, context }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/teams");

    await page.waitForLoadState();

    const locator = page.getByRole("heading", { name: "Teams", exact: true });

    await expect(locator).toBeVisible();
  });
});

test.describe("Teams - NonOrg", () => {
  test.afterEach(({ users }) => users.deleteAll());

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
      teamMatesObj.concat([{ name: owner.name! }]).some((teamMate) => {
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
      await page.waitForURL(/\/settings\/teams\/(\d+)\/event-type*$/i);
      await page.locator("[data-testid=handle-later-button]").click();
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
    await page.goto(`/settings/teams/${team.id}/settings`);
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

    await page.goto(`/event-types?teamId=${team.id}`);

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
  test("Reschedule a Collective EventType booking", async ({ users, page, bookings }) => {
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
    const eventType = await owner.getFirstTeamEvent(team.id);

    const booking = await bookings.create(owner.id, owner.username, eventType.id);
    await page.goto(`/reschedule/${booking.uid}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await confirmReschedule(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });
  todo("Reschedule a Round Robin EventType booking");
});

test.describe("Team Slug Validation", () => {
  test.afterEach(({ users, orgs }) => {
    users.deleteAll();
    orgs.deleteAll();
  });

  test("Teams in different organizations can have the same slug", async ({ page, users, orgs }) => {
    const org1 = await orgs.create({ name: "Organization 1" });
    const org2 = await orgs.create({ name: "Organization 2" });

    const owner1 = await users.create(
      {
        organizationId: org1.id,
        roleInOrganization: "OWNER",
      },
      {
        hasTeam: true,
        teamSlug: "cal",
        teamRole: "OWNER",
      }
    );

    const owner2 = await users.create(
      {
        organizationId: org2.id,
        roleInOrganization: "OWNER",
      },
      {
        hasTeam: true,
        teamSlug: "calCom",
        teamRole: "OWNER",
      }
    );
    const { team: team1 } = await owner1.getFirstTeamMembership();

    await owner1.apiLogin();
    await page.goto(`/settings/teams/${team1.id}/profile`);
    await page.locator('input[name="slug"]').fill("calCom");
    await submitAndWaitForResponse(page, "/api/trpc/teams/update?batch=1", {
      action: () => page.locator("[data-testid=update-team-profile]").click(),
    });
  });

  test("Teams within same organization cannot have duplicate slugs", async ({ page, users, orgs }) => {
    const org = await orgs.create({ name: "Organization 1" });

    const owner = await users.create(
      {
        organizationId: org.id,
        roleInOrganization: "OWNER",
      },
      {
        hasTeam: true,
        numberOfTeams: 2,
        teamRole: "OWNER",
      }
    );

    const teams = await owner.getAllTeamMembership();
    await owner.apiLogin();
    await page.goto(`/settings/teams/${teams[0].team.id}/profile`);
    if (!teams[1].team.slug) throw new Error("Slug not found for team 2");
    await page.locator('input[name="slug"]').fill(teams[1].team.slug);
    await submitAndWaitForResponse(page, "/api/trpc/teams/update?batch=1", {
      action: () => page.locator("[data-testid=update-team-profile]").click(),
      expectedStatusCode: 409,
    });
  });

  test("Teams without organization can have same slug as teams in organizations", async ({
    page,
    users,
    orgs,
  }) => {
    const org = await orgs.create({ name: "Organization 1" });

    const orgOwner = await users.create(
      {
        organizationId: org.id,
        roleInOrganization: "OWNER",
      },
      {
        hasTeam: true,
        teamSlug: "calCom",
        teamRole: "OWNER",
      }
    );

    const teamOwner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
      }
    );

    const { team } = await teamOwner.getFirstTeamMembership();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/profile`);
    await page.locator('input[name="slug"]').fill("calCom");
    await submitAndWaitForResponse(page, "/api/trpc/teams/update?batch=1", {
      action: () => page.locator("[data-testid=update-team-profile]").click(),
    });
  });
});
