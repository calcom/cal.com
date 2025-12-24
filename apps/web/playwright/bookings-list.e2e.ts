import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { BookingStatus, MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { addFilter } from "./filter-helpers";
import { createTeamEventType } from "./fixtures/users";
import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";
import { setupManagedEvent } from "./lib/testUtils";

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
        firstUpcomingBooking.locator(`text=${bookingWhereFirstUserIsAttendee!.title}`)
      ).toBeVisible();
      await expect(
        secondUpcomingBooking.locator(`text=${bookingWhereFirstUserIsOrganizer!.title}`)
      ).toBeVisible();
    });

    test("Cannot choose date range presets", async ({ page, users }) => {
      const firstUser = await users.create();
      await firstUser.apiLogin();
      const bookingsGetResponse = page.waitForResponse((response) =>
        /\/api\/trpc\/bookings\/get.*/.test(response.url())
      );
      await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
      await bookingsGetResponse;

      await addFilter(page, "dateRange");

      await expect(page.locator('[data-testid="date-range-options-c"]')).toBeHidden();
      await expect(page.locator('[data-testid="date-range-options-w"]')).toBeHidden();
      await expect(page.locator('[data-testid="date-range-options-m"]')).toBeHidden();
      await expect(page.locator('[data-testid="date-range-options-y"]')).toBeHidden();
      await expect(page.locator('[data-testid="date-range-options-t"]')).toBeHidden();
      await expect(page.locator('[data-testid="date-range-options-tdy"]')).toBeHidden();

      await expect(page.locator('[data-testid="date-range-calendar"]')).toBeVisible();
    });
  });
  test.describe("Past bookings", () => {
    test("Mark first guest as no-show", async ({ page, users, bookings, webhooks }) => {
      const firstUser = await users.create();
      await users.create();

      const bookingWhereFirstUserIsOrganizerFixture = await createBooking({
        title: "Booking as organizer",
        bookingsFixture: bookings,
        // Create a booking 3 days ago
        relativeDate: -3,
        organizer: firstUser,
        organizerEventType: firstUser.eventTypes[0],
        attendees: [
          { name: "First", email: "first@cal.com", timeZone: "Europe/Berlin" },
          { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      const bookingWhereFirstUserIsOrganizer = await bookingWhereFirstUserIsOrganizerFixture.self();
      await firstUser.apiLogin();
      const webhookReceiver = await webhooks.createReceiver();
      await page.goto(`/bookings/past`);
      const pastBookings = page.locator('[data-testid="past-bookings"]');
      const firstPastBooking = pastBookings.locator('[data-testid="booking-item"]').nth(0);
      const firstGuest = firstPastBooking.locator('[data-testid="guest"]').nth(0);
      await firstGuest.click();
      await expect(page.locator('[data-testid="unmark-no-show"]')).toBeHidden();
      await expect(page.locator('[data-testid="mark-no-show"]')).toBeVisible();
      await page.locator('[data-testid="mark-no-show"]').click();
      await firstGuest.click();
      await expect(page.locator('[data-testid="unmark-no-show"]')).toBeVisible();
      await expect(page.locator('[data-testid="mark-no-show"]')).toBeHidden();
      await webhookReceiver.waitForRequestCount(1);
      const [request] = webhookReceiver.requestList;
      const body = request.body;
      // remove dynamic properties that differs depending on where you run the tests
      const dynamic = "[redacted/dynamic]";
      // @ts-expect-error we are modifying the object
      body.createdAt = dynamic;
      expect(body).toMatchObject({
        triggerEvent: "BOOKING_NO_SHOW_UPDATED",
        createdAt: "[redacted/dynamic]",
        payload: {
          message: "first@cal.com marked as no-show",
          attendees: [{ email: "first@cal.com", noShow: true }],
          bookingUid: bookingWhereFirstUserIsOrganizer?.uid,
          bookingId: bookingWhereFirstUserIsOrganizer?.id,
        },
      });
      webhookReceiver.close();
    });
    test("Mark 3rd attendee as no-show", async ({ page, users, bookings }) => {
      const firstUser = await users.create();
      await users.create();

      const bookingWhereFirstUserIsOrganizerFixture = await createBooking({
        title: "Booking as organizer",
        bookingsFixture: bookings,
        // Create a booking 4 days ago
        relativeDate: -4,
        organizer: firstUser,
        organizerEventType: firstUser.eventTypes[0],
        attendees: [
          { name: "First", email: "first@cal.com", timeZone: "Europe/Berlin" },
          { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
          { name: "Fourth", email: "fourth@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      await bookingWhereFirstUserIsOrganizerFixture.self();

      await firstUser.apiLogin();
      await page.goto(`/bookings/past`);
      const pastBookings = page.locator('[data-testid="past-bookings"]');
      const firstPastBooking = pastBookings.locator('[data-testid="booking-item"]').nth(0);
      const moreGuests = firstPastBooking.locator('[data-testid="more-guests"]');
      await moreGuests.click();
      const firstGuestInMore = page.getByRole("menuitemcheckbox").nth(0);
      await expect(firstGuestInMore).toHaveAttribute("data-state", "unchecked");
      await firstGuestInMore.click();
      await expect(firstGuestInMore).toHaveAttribute("data-state", "checked");
      const updateNoShow = firstPastBooking.locator('[data-testid="update-no-show"]');
      await updateNoShow.click();
      await moreGuests.click();
      await expect(firstGuestInMore).toHaveAttribute("data-state", "checked");
    });
    test("Team admin/owner can mark first attendee as no-show", async ({
      page,
      users,
      bookings,
      webhooks,
    }) => {
      const { adminUser, memberUser, managedEvent } = await setupManagedEvent({ users });

      const bookingFixture = await createBooking({
        title: "Managed Event Booking",
        bookingsFixture: bookings,
        // Create a booking 3 days ago
        relativeDate: -3,
        organizer: memberUser,
        organizerEventType: managedEvent,
        attendees: [
          { name: "First Guest", email: "first@cal.com", timeZone: "Europe/Berlin" },
          { name: "Second Guest", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third Guest", email: "third@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      const booking = await bookingFixture.self();
      await adminUser.apiLogin();
      const { webhookReceiver } = await webhooks.createTeamReceiver();
      await page.goto(`/bookings/past`);
      const pastBookings = page.locator('[data-testid="past-bookings"]');
      const firstPastBooking = pastBookings.locator('[data-testid="booking-item"]').nth(0);
      const firstGuest = firstPastBooking.locator('[data-testid="guest"]').nth(0);
      await firstGuest.click();
      await expect(page.locator('[data-testid="mark-no-show"]')).toBeVisible();
      await page.locator('[data-testid="mark-no-show"]').click();
      await firstGuest.click();
      await expect(page.locator('[data-testid="unmark-no-show"]')).toBeVisible();
      await expect(page.locator('[data-testid="mark-no-show"]')).toBeHidden();
      await webhookReceiver.waitForRequestCount(1);
      const [request] = webhookReceiver.requestList;
      const body = request.body;
      const dynamic = "[redacted/dynamic]";
      // @ts-expect-error we are modifying the object
      body.createdAt = dynamic;
      expect(body).toMatchObject({
        triggerEvent: "BOOKING_NO_SHOW_UPDATED",
        createdAt: "[redacted/dynamic]",
        payload: {
          message: "first@cal.com marked as no-show",
          attendees: [{ email: "first@cal.com", noShow: true }],
          bookingUid: booking?.uid,
          bookingId: booking?.id,
        },
      });

      // Close webhook receiver
      webhookReceiver.close();
    });

    test("Can choose date range presets", async ({ page, users }) => {
      const firstUser = await users.create();
      await firstUser.apiLogin();
      const bookingsGetResponse = page.waitForResponse((response) =>
        /\/api\/trpc\/bookings\/get.*/.test(response.url())
      );
      await page.goto(`/bookings/past`);
      await bookingsGetResponse;

      await addFilter(page, "dateRange");

      await expect(page.locator('[data-testid="date-range-options-c"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-options-w"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-options-m"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-options-y"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-options-t"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-options-tdy"]')).toBeVisible();

      await expect(page.locator('[data-testid="date-range-calendar"]')).toBeHidden();
    });
  });

  test("People filter includes bookings where filtered person is attendee", async ({
    page,
    users,
    bookings,
  }) => {
    const firstUser = await users.create(
      { name: "First" },
      {
        hasTeam: true,
        teamRole: MembershipRole.ADMIN,
      }
    );
    const teamId = (await firstUser.getFirstTeamMembership()).teamId;
    const secondUser = await users.create({ name: "Second" });
    const thirdUser = await users.create({ name: "Third" });
    // Add teammates to the team
    await prisma.membership.createMany({
      data: [
        {
          teamId: teamId,
          userId: secondUser.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
        {
          teamId: teamId,
          userId: thirdUser.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });
    const teamEvent = await createTeamEventType(
      { id: firstUser.id },
      { id: teamId },
      { teamEventSlug: "team-event-slug" }
    );

    //Create a TeamEventType booking where ThirdUser is attendee
    const thirdUserAttendeeTeamEventBookingFixture = await createBooking({
      title: "ThirdUser is Attendee for TeamEvent",
      bookingsFixture: bookings,
      relativeDate: 6,
      organizer: firstUser,
      organizerEventType: teamEvent,
      attendees: [{ name: "Third", email: thirdUser.email, timeZone: "Europe/Berlin" }],
    });
    const thirdUserAttendeeTeamEvent = await thirdUserAttendeeTeamEventBookingFixture.self();

    //Create a IndividualEventType booking where ThirdUser,SecondUser are attendees and FirstUser is organizer
    const thirdUserAttendeeIndividualBookingFixture = await createBooking({
      title: "ThirdUser is Attendee and FirstUser is Organizer",
      bookingsFixture: bookings,
      relativeDate: 3,
      organizer: firstUser,
      organizerEventType: firstUser.eventTypes[0],
      attendees: [
        { name: "Third", email: thirdUser.email, timeZone: "Europe/Berlin" },
        { name: "Second", email: secondUser.email, timeZone: "Europe/Berlin" },
      ],
    });
    const thirdUserAttendeeIndividualBooking = await thirdUserAttendeeIndividualBookingFixture.self();

    //Create a IndividualEventType booking where ThirdUser is organizer and FirstUser,SecondUser are attendees
    const thirdUserOrganizerBookingFixture = await createBooking({
      title: "ThirdUser is Organizer and FirstUser is Attendee",
      bookingsFixture: bookings,
      organizer: thirdUser,
      relativeDate: 2,
      organizerEventType: thirdUser.eventTypes[0],
      attendees: [
        { name: "First", email: firstUser.email, timeZone: "Europe/Berlin" },
        { name: "Second", email: secondUser.email, timeZone: "Europe/Berlin" },
      ],
    });
    const thirdUserOrganizerBooking = await thirdUserOrganizerBookingFixture.self();

    //Create a booking where FirstUser is organizer and SecondUser is attendee
    await createBooking({
      title: "FirstUser is Organizer and SecondUser is Attendee",
      bookingsFixture: bookings,
      organizer: firstUser,
      relativeDate: 4,
      organizerEventType: firstUser.eventTypes[0],
      attendees: [{ name: "Second", email: secondUser.email, timeZone: "Europe/Berlin" }],
    });

    //admin login
    //Select 'ThirdUser' in people filter
    await firstUser.apiLogin();
    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;

    await addFilter(page, "userId");

    const bookingsGetResponse2 = page.waitForResponse(
      (response) => response.url().includes("/api/trpc/bookings/get?batch=1") && response.status() === 200
    );
    await page
      .locator(`[data-testid="select-filter-options-userId"] [role="option"]:has-text("${thirdUser.name}")`)
      .click();
    await bookingsGetResponse2;
    // Click the ellipsis menu button to open the dropdown
    await page.locator('[data-testid="booking-actions-dropdown"]').nth(0).click();
    // Check that the cancel option is visible in the dropdown
    await expect(page.locator('[data-testid="cancel"]')).toBeVisible();

    //expect only 3 bookings (out of 4 total) to be shown in list.
    //where ThirdUser is either organizer or attendee
    const upcomingBookingsTable = page.locator('[data-testid="upcoming-bookings"]');
    const bookingListItems = upcomingBookingsTable.locator('[data-testid="booking-item"]');
    const bookingListCount = await bookingListItems.count();

    expect(bookingListCount).toBe(3);

    //verify with the booking titles
    const firstUpcomingBooking = bookingListItems.nth(0);
    await expect(firstUpcomingBooking.locator(`text=${thirdUserOrganizerBooking!.title}`)).toBeVisible();

    const secondUpcomingBooking = bookingListItems.nth(1);
    await expect(
      secondUpcomingBooking.locator(`text=${thirdUserAttendeeIndividualBooking!.title}`)
    ).toBeVisible();

    const thirdUpcomingBooking = bookingListItems.nth(2);
    await expect(thirdUpcomingBooking.locator(`text=${thirdUserAttendeeTeamEvent!.title}`)).toBeVisible();
  });

  test("Does not show booking from another user from collective event type when a member is filtered", async ({
    page,
    users,
    bookings,
  }) => {
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
    const { id: eventTypeId } = eventType;

    // remove myself from host of this event type
    await prisma.host.delete({
      where: {
        userId_eventTypeId: {
          userId: owner.id,
          eventTypeId,
        },
      },
    });

    // teammate-1
    const host = await prisma.membership.findFirstOrThrow({
      where: {
        teamId: team.id,
        userId: {
          not: owner.id,
        },
      },
      include: {
        user: true,
      },
    });

    await createBooking({
      bookingsFixture: bookings,
      organizer: host.user,
      organizerEventType: eventType,
      attendees: [{ name: "test user", email: "test@example.com", timeZone: "Europe/Paris" }],
      relativeDate: 0,
      title: "Booking from test user",
    });

    // teammate-2
    const anotherUser = teamMatesObj.find((m) => m.name !== host.user.name)?.name;

    await owner.apiLogin();
    const bookingsGetResponse1 = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded" });
    await bookingsGetResponse1;

    await addFilter(page, "userId");
    const bookingsGetResponse2 = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page
      .locator(`[data-testid="select-filter-options-userId"] [role="option"]:has-text("${anotherUser}")`)
      .click();
    await bookingsGetResponse2;

    await expect(page.locator('[data-testid="booking-item"]')).toHaveCount(0);
  });

  test.describe("Filter Dropdown Item Search", () => {
    const filterItemsConfig = [
      { key: "eventTypeId", name: "Event Type", testId: "add-filter-item-eventTypeId" },
      { key: "teamId", name: "Team", testId: "add-filter-item-teamId" },
      { key: "attendeeName", name: "Attendees Name", testId: "add-filter-item-attendeeName" },
      { key: "attendeeEmail", name: "Attendee Email", testId: "add-filter-item-attendeeEmail" },
      { key: "dateRange", name: "Date Range", testId: "add-filter-item-dateRange" },
    ];
    const searchInputSelector = "[cmdk-input]";

    const getFilterItemLocator = (page: Page, testId: string) => page.locator(`[data-testid="${testId}"]`);

    const setup = async ({
      isAdmin,
      page,
      users,
    }: {
      isAdmin: boolean;
      page: Page;
      users: Fixtures["users"];
    }) => {
      const user = isAdmin ? await users.create(undefined, { hasTeam: true }) : await users.create();
      await user.apiLogin();
      const bookingsGetResponse = page.waitForResponse((response) =>
        /\/api\/trpc\/bookings\/get.*/.test(response.url())
      );
      await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
      await bookingsGetResponse;
      await page.locator('[data-testid="add-filter-button"]').click();
      await expect(page.locator(searchInputSelector)).toBeVisible();
    };

    test("should show all filter items initially and after clearing search", async ({ page, users }) => {
      await setup({ isAdmin: false, page, users });
      const searchInput = page.locator(searchInputSelector);

      // Initial check: all defined filter items should be visible
      for (const item of filterItemsConfig) {
        await expect(
          getFilterItemLocator(page, item.testId),
          `Item ${item.name} should be visible initially`
        ).toBeVisible();
      }

      // Type something and then clear the search
      await searchInput.fill("Some text");
      await searchInput.clear();

      // After clearing: all defined filter items should be visible again
      for (const item of filterItemsConfig) {
        await expect(
          getFilterItemLocator(page, item.testId),
          `Item ${item.name} should be visible after clearing search`
        ).toBeVisible();
      }
    });

    test("should show admin-only filter", async ({ page, users }) => {
      await setup({ isAdmin: true, page, users });

      await expect(
        getFilterItemLocator(page, "add-filter-item-userId"),
        `Item "Member" should be visible initially`
      ).toBeVisible();
    });

    test("search should be case-insensitive", async ({ page, users }) => {
      await setup({ isAdmin: true, page, users });

      const searchInput = page.locator(searchInputSelector);

      // Search for "member" (lowercase)
      await searchInput.fill("member");
      await expect(getFilterItemLocator(page, "add-filter-item-userId")).toBeVisible();
      await expect(getFilterItemLocator(page, "add-filter-item-eventTypeId")).toBeHidden();
      await expect(getFilterItemLocator(page, "add-filter-item-teamId")).toBeHidden();
    });

    test("should individually find each filter item by its full name", async ({ page, users }) => {
      await setup({ isAdmin: false, page, users });
      const searchInput = page.locator(searchInputSelector);

      for (const targetItem of filterItemsConfig) {
        await searchInput.fill(targetItem.name);

        // Check that the target item is visible
        await expect(
          getFilterItemLocator(page, targetItem.testId),
          `Searching for "${targetItem.name}", item "${targetItem.name}" should be visible`
        ).toBeVisible();

        await searchInput.clear();
      }
    });

    test("should show no items for a non-matching search term", async ({ page, users }) => {
      await setup({ isAdmin: false, page, users });
      const searchInput = page.locator(searchInputSelector);
      const nonExistentTerm = "NonExistentFilterXYZ123";
      await searchInput.fill(nonExistentTerm);

      for (const item of filterItemsConfig) {
        await expect(
          getFilterItemLocator(page, item.testId),
          `Item ${item.name} should be hidden for non-matching term '${nonExistentTerm}'`
        ).toBeHidden();
      }
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
   * -1 means yesterday
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
