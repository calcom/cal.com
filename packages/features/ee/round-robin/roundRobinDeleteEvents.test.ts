/**
 * Tests for calendar event deletion during round robin organizer change operations.
 * Covers scenarios where events need to be deleted from original hosts and
 * credential handling during organizer changes.
 */
import {
  getDate,
  createBookingScenario,
  getScenarioData,
  getMockBookingAttendee,
  TestData,
  getOrganizer,
  getGoogleCalendarCredential,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulRoundRobinReschedulingEmails,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { SchedulingType, BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

describe("roundRobinReassignment test", () => {
  setupAndTeardown();

  test("should delete calendar events from original host when round robin reassignment changes organizer", async ({
    emails,
  }) => {
    const roundRobinReassignment = (await import("./roundRobinReassignment")).default;

    const originalHost = getOrganizer({
      name: "Original Host",
      email: "originalhost@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const newHost = getOrganizer({
      name: "New Host",
      email: "newhost@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });
    const bookingToReassignUid = "booking-to-reassign-with-deletion";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slug: "round-robin-event",
            schedulingType: SchedulingType.ROUND_ROBIN,
            length: 45,
            users: [{ id: 101 }, { id: 102 }],
            hosts: [
              { userId: 101, isFixed: false },
              { userId: 102, isFixed: false },
            ],
          },
        ],
        bookings: [
          {
            id: 123,
            eventTypeId: 1,
            userId: originalHost.id,
            uid: bookingToReassignUid,
            status: BookingStatus.ACCEPTED,
            startTime: `${dateStringPlusOne}T05:00:00.000Z`,
            endTime: `${dateStringPlusOne}T05:45:00.000Z`,
            attendees: [
              getMockBookingAttendee({
                id: 2,
                name: "attendee",
                email: "attendee@test.com",
                locale: "en",
                timeZone: "Asia/Kolkata",
              }),
            ],
            references: [
              {
                id: 1,
                type: appStoreMetadata.googlecalendar.type,
                uid: "ORIGINAL_EVENT_ID",
                meetingId: "ORIGINAL_EVENT_ID",
                meetingPassword: null,
                meetingUrl: null,
                externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                credentialId: 1,
                deleted: null,
              },
            ],
          },
        ],
        organizer: originalHost,
        usersApartFromOrganizer: [newHost],
        apps: [TestData.apps["google-calendar"]],
      })
    );

    const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: { uid: "NEW_EVENT_ID" },
      update: { uid: "UPDATED_EVENT_ID" },
    });

    await roundRobinReassignment({
      bookingId: 123,
      reassignedById: 101,
      orgId: null,
    });

    // Verify that calendar deletion occurred (may be called multiple times due to duplicate references)
    expect(calendarMock.deleteEventCalls.length).toBeGreaterThanOrEqual(1);
    const deleteCall = calendarMock.deleteEventCalls[0];
    expect(deleteCall.args.uid).toBe("ORIGINAL_EVENT_ID");
    expect(deleteCall.args.externalCalendarId).toBe("MOCK_EXTERNAL_CALENDAR_ID");
    expect(deleteCall.args.event.organizer.email).toBe(originalHost.email);
    expect(deleteCall.args.event.uid).toBe(bookingToReassignUid);

    // Verify that creation occurred with new host credentials
    expect(calendarMock.createEventCalls.length).toBe(1);
    const createCall = calendarMock.createEventCalls[0];
    expect(createCall.args.calEvent.organizer.email).toBe(newHost.email);

    // Verify the booking was reassigned to the new host
    expectBookingToBeInDatabase({
      uid: bookingToReassignUid,
      userId: newHost.id,
    });

    expectSuccessfulRoundRobinReschedulingEmails({
      prevOrganizer: originalHost,
      newOrganizer: newHost,
      emails,
    });
  });
});
