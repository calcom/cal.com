import type { APIResponse } from "@playwright/test";
import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

import { createTeamEventType } from "./fixtures/users";
import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";
import { testName, bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Bookings", () => {
  test.describe("Upcoming bookings", () => {
    test("show attendee bookings and organizer bookings in asc order by startDate", async ({
      page,
      users,
      bookings,
    }) => {
      const firstUser = await users.create();
      const secondUser = await users.create();

      const bookingWhereFirstUserIsOrganizerFixture = await createBooking({
        title: "Booking as organizer",
        bookingsFixture: bookings,
        // Create a booking 3 days from today
        relativeDate: 3,
        organizer: firstUser,
        organizerEventType: firstUser.eventTypes[0],
        attendees: [
          { name: "First", email: "first@cal.com", timeZone: "Europe/Berlin" },
          { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      const bookingWhereFirstUserIsOrganizer = await bookingWhereFirstUserIsOrganizerFixture.self();

      const bookingWhereFirstUserIsAttendeeFixture = await createBooking({
        title: "Booking as attendee",
        bookingsFixture: bookings,
        organizer: secondUser,
        // Booking created 2 days from today
        relativeDate: 2,
        organizerEventType: secondUser.eventTypes[0],
        attendees: [
          { name: "OrganizerAsBooker", email: firstUser.email, timeZone: "Europe/Berlin" },
          { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      const bookingWhereFirstUserIsAttendee = await bookingWhereFirstUserIsAttendeeFixture.self();

      await firstUser.apiLogin();
      await page.goto(`/bookings/upcoming`);
      const upcomingBookings = page.locator('[data-testid="upcoming-bookings"]');
      const firstUpcomingBooking = upcomingBookings.locator('[data-testid="booking-item"]').nth(0);
      const secondUpcomingBooking = upcomingBookings.locator('[data-testid="booking-item"]').nth(1);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        firstUpcomingBooking.locator(`text=${bookingWhereFirstUserIsAttendee!.title}`)
      ).toBeVisible();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        secondUpcomingBooking.locator(`text=${bookingWhereFirstUserIsOrganizer!.title}`)
      ).toBeVisible();
    });
  });
});

test.describe("Bookings list view", () => {
  test("collective eventType booking should be visible to team admin", async ({ page, users, bookings }) => {
    const { owner1, owner2, commonUser, team1_teammate1 } = await createTeams(users);

    const { team: team1 } = await owner1.getFirstTeamMembership();
    const scenario = {
      schedulingType: SchedulingType.COLLECTIVE,
      teamEventTitle: `collective-team-event`,
      teamEventSlug: slugify(`collective-team-event-${randomString(5)}`),
    };

    const eventType = await createTeamEventType(owner1, team1, scenario);
    const { id: eventId } = eventType;

    await prisma.host.createMany({
      data: [
        {
          userId: commonUser.id,
          eventTypeId: eventId,
        },
        {
          userId: team1_teammate1.id,
          eventTypeId: eventId,
        },
      ],
    });

    await prisma.host.deleteMany({
      where: {
        userId: owner1.id,
        eventTypeId: eventId,
      },
    });

    await bookEvent({ pageFixture: page, eventType, team: team1 });

    await bookingVisibleFor({ user: owner1, pageFixture: page, eventType, shouldBeVisible: true });
    await bookingVisibleFor({ user: owner2, pageFixture: page, eventType, shouldBeVisible: false });
    await bookingVisibleFor({ user: commonUser, pageFixture: page, eventType, shouldBeVisible: true });
  });
  test("round-robin eventType booking should be visible to team admin", async ({ page, users, bookings }) => {
    const { owner1, owner2, commonUser, team1_teammate1 } = await createTeams(users);

    const { team: team1 } = await owner1.getFirstTeamMembership();
    const scenario = {
      schedulingType: SchedulingType.ROUND_ROBIN,
      teamEventTitle: `round-robin-team-event`,
      teamEventSlug: slugify(`round-robin-team-event-${randomString(5)}`),
    };

    const eventType = await createTeamEventType(owner1, team1, scenario);
    const { id: eventId } = eventType;

    await prisma.host.createMany({
      data: [
        {
          userId: commonUser.id,
          eventTypeId: eventId,
        },
        {
          userId: team1_teammate1.id,
          eventTypeId: eventId,
        },
      ],
    });

    await prisma.host.deleteMany({
      where: {
        userId: owner1.id,
        eventTypeId: eventId,
      },
    });

    await bookEvent({ pageFixture: page, eventType, team: team1 });

    await bookingVisibleFor({ user: owner1, pageFixture: page, eventType, shouldBeVisible: true });
    await bookingVisibleFor({ user: owner2, pageFixture: page, eventType, shouldBeVisible: false });
  });
  test("managed eventType booking should be visible to team admin", async ({ page, users, bookings }) => {
    const { owner1, owner2, commonUser, team1_teammate1 } = await createTeams(users);

    const { team: team1 } = await owner1.getFirstTeamMembership();

    await owner1.apiLogin();
    await page.goto(`/event-types?dialog=new&eventPage=team%2F${team1.slug}&teamId=${team1.id}`);
    await page.getByTestId("managed-event-type").click();
    await page.getByTestId("event-type-quick-chat").click();
    await page.getByTestId("event-type-quick-chat").fill("managed-event");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId("vertical-tab-assignment").click();

    await page.locator("span:nth-child(3) > .bg-default > div > .text-emphasis").nth(0).click();
    await page.getByRole("combobox", { name: "assignment-dropdown" }).fill("commonUser");
    await page.getByRole("combobox", { name: "assignment-dropdown" }).press("Enter");
    await page.getByRole("combobox", { name: "assignment-dropdown" }).fill("team1_teammate1");
    await page.getByRole("combobox", { name: "assignment-dropdown" }).press("Enter");
    await page.getByTestId("update-eventtype").click();

    const eventType = await owner1.getFirstTeamEvent(team1.id);

    await bookEvent({ pageFixture: page, eventType, user: commonUser });

    await bookingVisibleFor({ user: owner1, pageFixture: page, eventType, shouldBeVisible: true });
    await bookingVisibleFor({ user: owner2, pageFixture: page, eventType, shouldBeVisible: false });
    await bookingVisibleFor({ user: commonUser, pageFixture: page, eventType, shouldBeVisible: true });
    await bookingVisibleFor({ user: team1_teammate1, pageFixture: page, eventType, shouldBeVisible: false });
  });
});

async function createBooking({
  bookingsFixture,
  organizer,
  organizerEventType,
  attendees,
  /**
   * Relative date from today
   * 0 means today
   * 1 means tomorrow
   */
  relativeDate = 0,
  durationMins = 30,
  title,
}: {
  bookingsFixture: Fixtures["bookings"];
  organizer: {
    id: number;
    username: string | null;
  };
  organizerEventType: {
    id: number;
  };
  attendees: {
    name: string;
    email: string;
    timeZone: string;
  }[];
  relativeDate?: number;
  durationMins?: number;
  title: string;
}) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const bookingDurationMs = durationMins * 60 * 1000;
  const startTime = new Date(Date.now() + relativeDate * DAY_MS);
  const endTime = new Date(Date.now() + relativeDate * DAY_MS + bookingDurationMs);
  return await bookingsFixture.create(organizer.id, organizer.username, organizerEventType.id, {
    title,
    status: BookingStatus.ACCEPTED,
    startTime,
    endTime,
    attendees: {
      createMany: {
        data: [...attendees],
      },
    },
  });
}

const createTeams = async (userFixture: Fixtures["users"]) => {
  const owner1 = await userFixture.create({ username: "team-owner-1", name: "team-owner-1" });
  const owner2 = await userFixture.create({ username: "team-owner-2", name: "team-owner-2" });
  const commonUser = await userFixture.create({ name: "commonUser" });
  const team1_teammate1 = await userFixture.create({ name: "team1_teammate1" });
  const team1_teammate2 = await userFixture.create({ name: "team1_teammate2" });
  const team2_teammate1 = await userFixture.create({ name: "team2_teammate1" });
  const teamOne = await prisma.team.create({
    data: {
      name: "bookings-test-team-1",
      slug: slugify(`bookings-test-team-2-${randomString(5)}`),
    },
  });

  const teamTwo = await prisma.team.create({
    data: {
      name: "bookings-test-team-2",
      slug: slugify(`bookings-test-team-2-${randomString(5)}`),
    },
  });

  // create memberships
  await prisma.membership.createMany({
    data: [
      {
        userId: owner1.id,
        teamId: teamOne.id,
        accepted: true,
        role: "OWNER",
      },
      {
        userId: commonUser.id,
        teamId: teamOne.id,
        accepted: true,
        role: "MEMBER",
      },
      {
        userId: team1_teammate1.id,
        teamId: teamOne.id,
        accepted: true,
        role: "MEMBER",
      },
      {
        userId: team1_teammate2.id,
        teamId: teamOne.id,
        accepted: true,
        role: "MEMBER",
      },
      {
        userId: owner2.id,
        teamId: teamTwo.id,
        accepted: true,
        role: "OWNER",
      },
      {
        userId: commonUser.id,
        teamId: teamTwo.id,
        accepted: true,
        role: "MEMBER",
      },
      {
        userId: team2_teammate1.id,
        teamId: teamTwo.id,
        accepted: true,
        role: "MEMBER",
      },
    ],
  });
  return {
    owner1,
    owner2,
    commonUser,
    team1_teammate1,
    team1_teammate2,
    team2_teammate1,
    teamOne,
    teamTwo,
  };
};

const bookEvent = async ({
  pageFixture,
  team,
  eventType,
  user,
}: {
  pageFixture: Fixtures["page"];
  team?: {
    id: number;
    slug: string | null;
    name: string;
  };
  user?: {
    id: number;
    name: string | null;
    username: string | null;
  };
  eventType: {
    id: number;
    title: string;
    slug: string;
  };
}) => {
  if (team?.slug) {
    await pageFixture.goto(`/team/${team.slug}/${eventType.slug}/`);
  } else if (user?.username) {
    await pageFixture.goto(`/${user.username}/${eventType.slug}/`);
  }
  await selectFirstAvailableTimeSlotNextMonth(pageFixture);
  await bookTimeSlot(pageFixture);
  await expect(pageFixture.locator("[data-testid=success-page]")).toBeVisible();

  // The title of the booking
  let BookingTitle = "";
  if (team?.name) {
    BookingTitle = `${eventType.title} between ${team.name} and ${testName}`;
  } else if (user?.name) {
    BookingTitle = `${eventType.title} between ${user.name} and ${testName}`;
  }
  await expect(pageFixture.locator("[data-testid=booking-title]")).toHaveText(BookingTitle);
  // The booker should be in the attendee list
  await expect(pageFixture.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);
};

const bookingVisibleFor = async ({
  user,
  pageFixture,
  eventType,
  shouldBeVisible,
}: {
  user: { apiLogin: () => Promise<APIResponse> };
  pageFixture: Fixtures["page"];
  eventType: { title: string };
  shouldBeVisible: boolean;
}) => {
  await user.apiLogin();
  await pageFixture.goto(`/bookings/upcoming`);
  const upcomingBookings = pageFixture.locator('[data-testid="upcoming-bookings"]');
  const upcomingBookingList = upcomingBookings.locator('[data-testid="booking-item"]').nth(0);
  shouldBeVisible
    ? await expect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        upcomingBookingList.locator(`text=${eventType.title}`)
      ).toBeVisible()
    : await expect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        upcomingBookingList.locator(`text=${eventType.title}`)
      ).toBeHidden();
};
