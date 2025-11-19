import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import {
  getDate,
  createBookingScenario,
  getScenarioData,
  getMockBookingAttendee,
  TestData,
  addWorkflowReminders,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulRoundRobinReschedulingEmails,
  expectWorkflowToBeTriggered,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, vi, expect } from "vitest";

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { SchedulingType, BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

vi.mock("@calcom/features/bookings/lib/EventManager");

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
    const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;

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
      expect.arrayContaining([expect.objectContaining(testDestinationCalendar)]),
      undefined,
      true
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
    const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;

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
      [],
      undefined,
      false
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
});
