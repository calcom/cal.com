import {
  addBookings,
  addEventTypesToDb,
  addUsersToDb,
  getDate,
  getMockBookingAttendee,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { describe, expect, vi, test } from "vitest";

vi.mock("@calcom/features/bookings/lib/EventManager");
vi.mock("@calcom/emails/email-manager");

describe("managedEventManualReassignment - organizationId propagation", () => {
  setupAndTeardown();

  test("should propagate organizationId through both CalendarEventBuilder chains", async () => {
    const managedEventManualReassignment = (await import("./managedEventManualReassignment")).default;

    // Spy on EventManager.create to capture calEvent for the calendar event creation builder chain
    const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;
    const createSpy = vi.spyOn(EventManager.prototype, "create");
    createSpy.mockResolvedValue({ results: [], referencesToCreate: [] });
    vi.spyOn(EventManager.prototype, "deleteEventsAndMeetings").mockResolvedValue({
      results: [],
      referencesToCreate: [],
    });

    // Spy on email functions to capture calEvent for the email notification builder chain
    const emails = await import("@calcom/emails/email-manager");
    const scheduledEmailSpy = vi.mocked(emails.sendReassignedScheduledEmailsAndSMS);
    const reassignedEmailSpy = vi.mocked(emails.sendReassignedEmailsAndSMS);
    const updatedEmailSpy = vi.mocked(emails.sendReassignedUpdatedEmailsAndSMS);
    scheduledEmailSpy.mockClear();
    reassignedEmailSpy.mockClear();
    updatedEmailSpy.mockClear();

    const orgId = 42;
    const ORIGINAL_USER_ID = 101;
    const NEW_USER_ID = 102;
    const PARENT_EVENT_TYPE_ID = 1;
    const ORIGINAL_CHILD_EVENT_TYPE_ID = 2;
    const NEW_CHILD_EVENT_TYPE_ID = 3;
    const TEAM_ID = 100;

    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });

    // Set up users directly in prismock
    await addUsersToDb([
      {
        id: ORIGINAL_USER_ID,
        name: "Original Host",
        email: "original@test.com",
        username: "original-host",
        timeZone: "UTC",
        locale: "en",
        completedOnboarding: true,
      },
      {
        id: NEW_USER_ID,
        name: "New Host",
        email: "newhost@test.com",
        username: "new-host",
        timeZone: "UTC",
        locale: "en",
        completedOnboarding: true,
      },
    ]);

    // Set up event types: parent MANAGED + two child event types with explicit userId and parentId
    await addEventTypesToDb([
      {
        id: PARENT_EVENT_TYPE_ID,
        title: "Managed Parent",
        slug: "managed-parent",
        length: 30,
        schedulingType: SchedulingType.MANAGED,
        team: { id: TEAM_ID },
      },
      {
        id: ORIGINAL_CHILD_EVENT_TYPE_ID,
        title: "Original Child",
        slug: "original-child",
        length: 30,
        userId: ORIGINAL_USER_ID,
        parentId: PARENT_EVENT_TYPE_ID,
      },
      {
        id: NEW_CHILD_EVENT_TYPE_ID,
        title: "New Child",
        slug: "new-child",
        length: 30,
        userId: NEW_USER_ID,
        parentId: PARENT_EVENT_TYPE_ID,
      },
    ]);

    // Set up booking on the original child event type
    await addBookings([
      {
        id: 123,
        eventTypeId: ORIGINAL_CHILD_EVENT_TYPE_ID,
        userId: ORIGINAL_USER_ID,
        uid: "booking-to-reassign",
        status: BookingStatus.ACCEPTED,
        startTime: `${dateStringPlusOne}T10:00:00.000Z`,
        endTime: `${dateStringPlusOne}T10:30:00.000Z`,
        attendees: [
          getMockBookingAttendee({
            id: 1,
            name: "Attendee",
            email: "attendee@test.com",
            locale: "en",
            timeZone: "UTC",
          }),
        ],
      },
    ]);

    await managedEventManualReassignment({
      bookingId: 123,
      newUserId: NEW_USER_ID,
      orgId,
      reassignedById: ORIGINAL_USER_ID,
      emailsEnabled: true,
      isAutoReassignment: false,
    });

    // Verify organizationId propagates through the calendar event creation builder chain
    expect(createSpy).toHaveBeenCalledTimes(1);
    const calEventForCalendar = createSpy.mock.calls[0][0];
    expect(calEventForCalendar.organizationId).toBe(orgId);

    // Verify organizationId propagates through the email notification builder chain
    expect(scheduledEmailSpy).toHaveBeenCalledTimes(1);
    const scheduledCallArg = scheduledEmailSpy.mock.calls[0][0];
    expect(scheduledCallArg.calEvent.organizationId).toBe(orgId);

    expect(reassignedEmailSpy).toHaveBeenCalledTimes(1);
    const reassignedCallArg = reassignedEmailSpy.mock.calls[0][0];
    expect(reassignedCallArg.calEvent.organizationId).toBe(orgId);

    createSpy.mockRestore();
  });
});
