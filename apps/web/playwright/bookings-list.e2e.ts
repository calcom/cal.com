import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

import { createTeamEventType } from "./fixtures/users";
import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";
import { assertBookingVisibleFor, bookTeamEvent, bookUserEvent } from "./lib/testUtils";

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
    test("collective eventType booking should be visible to team admin", async ({ page, users }) => {
      const { owner1, owner2, commonUser, team1_teammate1 } = await createTeams(users);

      const { team: team1 } = await owner1.getFirstTeamMembership();
      const scenario = {
        schedulingType: SchedulingType.COLLECTIVE,
        teamEventTitle: `collective-team-event`,
        teamEventSlug: slugify(`collective-team-event-${randomString(5)}`),
      };

      const eventType = await createTeamEventType(owner1, team1, scenario);
      const { id: eventId, slug: evnetSlug } = eventType;

      await prisma.host.createMany({
        data: [
          {
            userId: commonUser.id,
            eventTypeId: eventId,
            isFixed: true,
          },
          {
            userId: team1_teammate1.id,
            eventTypeId: eventId,
            isFixed: true,
          },
        ],
      });

      // to test if booking is visible to team admin/owner even if he is not part of the booking
      await prisma.host.deleteMany({
        where: {
          userId: owner1.id,
          eventTypeId: eventId,
        },
      });

      await bookTeamEvent(page, team1, eventType);

      // booking should be visible for the team host even though he is not part of the booking
      await assertBookingVisibleFor(owner1, page, eventType, true);
      // booking should not be visible for other team host
      await assertBookingVisibleFor(owner2, page, eventType, false);
      // booking should be visible for commonUser as he is part of the booking
      await assertBookingVisibleFor(commonUser, page, eventType, true);
      // booking should be visible for team1_teammate1 as he is part of the booking
      await assertBookingVisibleFor(team1_teammate1, page, eventType, true);
    });
    test("round-robin eventType booking should be visible to team admin", async ({ page, users }) => {
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

      await bookTeamEvent(page, team1, eventType);

      // booking should be visible for the team host even though he is not part of the booking
      await assertBookingVisibleFor(owner1, page, eventType, true);
      // bookings should not be visible for other team host
      await assertBookingVisibleFor(owner2, page, eventType, false);
    });
    test("managed eventType booking should be visible to team admin", async ({ page, users }) => {
      const { owner1, owner2, commonUser, team1_teammate1 } = await createTeams(users);

      const { team: team1 } = await owner1.getFirstTeamMembership();

      await owner1.apiLogin();
      await page.goto(`/event-types?dialog=new&eventPage=team%2F${team1.slug}&teamId=${team1.id}`);
      await page.getByTestId("managed-event-type").click();
      await page.getByTestId("event-type-quick-chat").click();
      await page.getByTestId("event-type-quick-chat").fill("managed-event");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByTestId("vertical-tab-assignment").click();

      await page.getByRole("combobox", { name: "assignment-dropdown" }).fill("commonUser");
      await page.getByRole("combobox", { name: "assignment-dropdown" }).press("Enter");
      await page.getByRole("combobox", { name: "assignment-dropdown" }).fill("team1_teammate1");
      await page.getByRole("combobox", { name: "assignment-dropdown" }).press("Enter");
      await page.getByTestId("update-eventtype").click();

      const eventType = await owner1.getFirstTeamEvent(team1.id);

      await bookUserEvent(page, commonUser, eventType);

      // booking should be visible for the team host even though he is not part of the booking
      await assertBookingVisibleFor(owner1, page, eventType, true);
      // booking should not be visible for other team host
      await assertBookingVisibleFor(owner2, page, eventType, false);
      // booking should be visible for commonUser as he is part of the booking
      await assertBookingVisibleFor(commonUser, page, eventType, true);
      // booking should not be visible for team1_teammate1 as we booked for commonUser
      await assertBookingVisibleFor(team1_teammate1, page, eventType, false);
    });
    test("individual team members booking should not be visible to team admin", async ({ page, users }) => {
      const { owner1, owner2, commonUser, team1_teammate1 } = await createTeams(users);

      const eventType = await commonUser.getFirstEventAsOwner();
      await bookUserEvent(page, commonUser, eventType);
      // non-team bookings should not be visible for the team host
      await assertBookingVisibleFor(owner1, page, eventType, false);
      // non-team bookings should not be visible for other team host
      await assertBookingVisibleFor(owner2, page, eventType, false);
      // booking should be visible for commonUser as he is part of the booking
      await assertBookingVisibleFor(commonUser, page, eventType, true);
    });
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
  const owner1 = await userFixture.create({ name: "team-owner-1" });
  const owner2 = await userFixture.create({ name: "team-owner-2" });
  const commonUser = await userFixture.create({ name: "commonUser" });
  const team1_teammate1 = await userFixture.create({ name: "team1_teammate1" });
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
    team2_teammate1,
    teamOne,
    teamTwo,
  };
};
