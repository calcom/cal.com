import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import {
  getDate,
  createBookingScenario,
  getScenarioData,
  getMockBookingAttendee,
  TestData,
  addWorkflowReminders,
  getOrganizer,
  getGoogleCalendarCredential,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulRoundRobinReschedulingEmails,
  expectWorkflowToBeTriggered,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, vi, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { SchedulingType, BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

vi.mock("@calcom/lib/EventManager");

const testDestinationCalendar = {
  integration: "test-calendar",
  externalId: "test-calendar",
};

const testUsers = [
  {
    id: 1,
    name: "user-1",
    timeZone: "Asia/Kolkata",
    username: "host-1",
    email: "host1@test.com",
    schedules: [TestData.schedules.IstWorkHours],
    destinationCalendar: testDestinationCalendar,
  },
  {
    id: 2,
    name: "user-2",
    timeZone: "Asia/Kolkata",
    username: "host-2",
    email: "host2@test.com",
    schedules: [TestData.schedules.IstWorkHours],
  },
  {
    id: 3,
    name: "user-3",
    timeZone: "Asia/Kolkata",
    username: "host-3",
    email: "host3@test.com",
    schedules: [TestData.schedules.IstWorkHours],
  },
];

describe("roundRobinReassignment test", () => {
  setupAndTeardown();

  test("reassign new round robin organizer", async ({ emails }) => {
    const roundRobinReassignment = (await import("./roundRobinReassignment")).default;
    const EventManager = (await import("@calcom/lib/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype as any, "reschedule");
    eventManagerSpy.mockResolvedValue({ referencesToCreate: [] });

    const users = testUsers;
    const originalHost = users[0];
    const newHost = users[1];
    // Assume we are using the RR fairness algorithm. Add an extra booking for user[2] to ensure user[1] is the new host

    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });
    const { dateString: dateStringMinusOne } = getDate({ dateIncrement: -1 });
    const { dateString: dateStringPlusTwo } = getDate({ dateIncrement: 2 });

    const bookingToReassignUid = "booking-to-reassign";

    const bookingData = await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            userId: originalHost.id,
            trigger: "NEW_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeEventTypeId: 1,
          },
        ],
        eventTypes: [
          {
            id: 1,
            slug: "round-robin-event",
            schedulingType: SchedulingType.ROUND_ROBIN,
            length: 45,
            users: users.map((user) => {
              return {
                id: user.id,
              };
            }),
            hosts: users.map((user) => {
              return {
                userId: user.id,
                isFixed: false,
              };
            }),
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
            endTime: `${dateStringPlusOne}T05:15:00.000Z`,
            attendees: [
              getMockBookingAttendee({
                id: 2,
                name: "attendee",
                email: "attendee@test.com",
                locale: "en",
                timeZone: "Asia/Kolkata",
              }),
            ],
          },
          {
            id: 456,
            eventTypeId: 1,
            userId: users[2].id,
            uid: bookingToReassignUid,
            status: BookingStatus.ACCEPTED,
            startTime: `${dateStringMinusOne}T05:00:00.000Z`,
            endTime: `${dateStringMinusOne}T05:15:00.000Z`,
            attendees: [
              getMockBookingAttendee({
                id: 2,
                name: "attendee",
                email: "attendee@test.com",
                locale: "en",
                timeZone: "Asia/Kolkata",
              }),
            ],
          },
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );
    await addWorkflowReminders([
      {
        bookingUid: bookingToReassignUid,
        method: WorkflowMethods.EMAIL,
        scheduledDate: dateStringPlusTwo,
        scheduled: true,
        workflowStepId: 1,
        workflowId: 1,
      },
    ]);

    await roundRobinReassignment({
      bookingId: 123,
    });

    expect(eventManagerSpy).toBeCalledTimes(1);
    // Triggers moving to new host within event manager
    expect(eventManagerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      bookingToReassignUid,
      undefined,
      true,
      expect.arrayContaining([expect.objectContaining(testDestinationCalendar)])
    );

    // Use equal fairness rr algorithm
    expectBookingToBeInDatabase({
      uid: bookingToReassignUid,
      userId: newHost.id,
    });

    expectSuccessfulRoundRobinReschedulingEmails({
      prevOrganizer: originalHost,
      newOrganizer: newHost,
      emails,
    });

    expectWorkflowToBeTriggered({ emailsToReceive: [newHost.email], emails });
  });

  // TODO: add fixed hosts test
  test("Reassign round robin host with fixed host as organizer", async () => {
    const roundRobinReassignment = (await import("./roundRobinReassignment")).default;
    const EventManager = (await import("@calcom/lib/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype as any, "reschedule");

    const users = testUsers;

    const bookingToReassignUid = "booking-to-reassign";

    const fixedHost = users[0];
    const currentRRHost = users[1];
    const newHost = users[2];
    // Assume we are using the RR fairness algorithm. Add an extra booking for user[2] to ensure user[1] is the new host
    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            userId: fixedHost.id,
            trigger: "NEW_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeEventTypeId: 1,
          },
        ],
        eventTypes: [
          {
            id: 1,
            slug: "round-robin-event",
            schedulingType: SchedulingType.ROUND_ROBIN,
            length: 45,
            users: users.map((user) => {
              return {
                id: user.id,
              };
            }),
            hosts: users.map((user) => {
              return {
                userId: user.id,
                isFixed: !!(user.id === fixedHost.id),
              };
            }),
          },
        ],
        bookings: [
          {
            id: 123,
            eventTypeId: 1,
            userId: fixedHost.id,
            uid: bookingToReassignUid,
            status: BookingStatus.ACCEPTED,
            startTime: `${dateStringPlusOne}T05:00:00.000Z`,
            endTime: `${dateStringPlusOne}T05:15:00.000Z`,
            attendees: [
              getMockBookingAttendee({
                id: 1,
                name: "attendee",
                email: "attendee@test.com",
                locale: "en",
                timeZone: "Asia/Kolkata",
              }),
              getMockBookingAttendee({
                id: currentRRHost.id,
                name: currentRRHost.name,
                email: currentRRHost.email,
                locale: "en",
                timeZone: currentRRHost.timeZone,
              }),
            ],
          },
        ],
        organizer: fixedHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinReassignment({
      bookingId: 123,
    });

    expect(eventManagerSpy).toBeCalledTimes(1);
    // Triggers moving to new host within event manager
    expect(eventManagerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      bookingToReassignUid,
      undefined,
      false,
      []
    );

    // Ensure organizer stays the same
    expectBookingToBeInDatabase({
      uid: bookingToReassignUid,
      userId: 1,
    });

    const bookingRepo = new BookingRepository(prismaMock);
    const attendees = await bookingRepo.getBookingAttendees(123);

    expect(attendees.some((attendee) => attendee.email === currentRRHost.email)).toBe(false);

    expect(attendees.some((attendee) => attendee.email === newHost.email)).toBe(true);
  });
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

    const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: { uid: "NEW_EVENT_ID" },
      update: { uid: "UPDATED_EVENT_ID" },
    });

    await roundRobinReassignment({
      bookingId: 123,
    });

    // Verify that calendar deletion occurred (may be called multiple times due to duplicate references)
    expect(calendarMock.deleteEventCalls.length).toBeGreaterThanOrEqual(1);
    const deleteCall = calendarMock.deleteEventCalls[0];
    expect(deleteCall.args.uid).toBe("ORIGINAL_EVENT_ID");
    expect(deleteCall.args.externalCalendarId).toBe("MOCK_EXTERNAL_CALENDAR_ID");
    expect(deleteCall.args.event.organizer.email).toBe(newHost.email); // Current implementation uses new host credentials
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
      previousOrganizer: originalHost,
      newOrganizer: newHost,
      emails,
    });
  });
});
