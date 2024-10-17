import {
  getDate,
  createBookingScenario,
  getScenarioData,
  getMockBookingAttendee,
  TestData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulReschedulingEmails,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, vi, expect } from "vitest";

import { SchedulingType, BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

vi.mock("@calcom/core/EventManager");

const testUsers = [
  {
    id: 1,
    name: "user-1",
    timeZone: "Asia/Kolkata",
    username: "host-1",
    email: "host1@test.com",
    schedules: [TestData.schedules.IstWorkHours],
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

describe("roundRobinManualReassignment test", () => {
  setupAndTeardown();

  test("manually reassign to a specific user", async ({ emails }) => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const EventManager = (await import("@calcom/core/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype as any, "reschedule");
    eventManagerSpy.mockResolvedValue({ referencesToCreate: [] });

    const users = testUsers;
    const originalHost = users[0];
    const newHost = users[2]; // We'll manually reassign to user-3
    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });

    const bookingToReassignUid = "manual-reassign-booking";

    const bookingData = await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slug: "team-event",
            schedulingType: SchedulingType.COLLECTIVE,
            length: 45,
            users: users.map((user) => ({ id: user.id })),
          },
        ],
        bookings: [
          {
            id: 789,
            eventTypeId: 1,
            userId: originalHost.id,
            uid: bookingToReassignUid,
            status: BookingStatus.ACCEPTED,
            startTime: `${dateStringPlusOne}T05:00:00.000Z`,
            endTime: `${dateStringPlusOne}T05:45:00.000Z`,
            attendees: [
              getMockBookingAttendee({
                id: 3,
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

    // Perform manual reassignment
    await roundRobinManualReassignment({
      bookingId: 789,
      newUserId: newHost.id,
    });

    expect(eventManagerSpy).toBeCalledTimes(1);
    // Triggers moving to new host within event manager
    expect(eventManagerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      bookingToReassignUid,
      undefined,
      true,
      []
    );

    // Check if the booking is reassigned to the new host
    expectBookingToBeInDatabase({
      uid: bookingToReassignUid,
      userId: newHost.id,
    });

    // Check if the correct emails are sent
    expectSuccessfulReschedulingEmails({
      prevOrganizer: originalHost,
      newOrganizer: newHost,
      emails,
    });
  });

  // Add more test cases here, such as:
  // - Trying to reassign to an unavailable user
  // - Reassigning a booking that doesn't exist
  // - Reassigning to a user who is not part of the event type
});
