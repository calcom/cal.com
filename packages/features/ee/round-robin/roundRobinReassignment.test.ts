import prismaMock from "@calcom/testing/lib/__mocks__/prisma";
import {
  addWorkflowReminders,
  createBookingScenario,
  getDate,
  getMockBookingAttendee,
  getScenarioData,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingStatus, SchedulingType, WorkflowMethods } from "@calcom/prisma/enums";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulRoundRobinReschedulingEmails,
  expectWorkflowToBeTriggered,
} from "@calcom/testing/lib/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { parse } from "node-html-parser";
import { v4 as uuidv4 } from "uuid";
import { beforeEach, describe, expect, vi } from "vitest";
import type { BookingEventHandlerService } from "../../bookings/lib/onBookingEvents/BookingEventHandlerService";

vi.mock("@calcom/features/bookings/lib/EventManager");
vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: vi.fn(),
}));

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
    uuid: "uuid-1",
  },
  {
    id: 2,
    name: "user-2",
    timeZone: "Asia/Kolkata",
    username: "host-2",
    email: "host2@test.com",
    schedules: [TestData.schedules.IstWorkHours],
    uuid: "uuid-2",
  },
  {
    id: 3,
    name: "user-3",
    timeZone: "Asia/Kolkata",
    username: "host-3",
    email: "host3@test.com",
    schedules: [TestData.schedules.IstWorkHours],
    uuid: "uuid-3",
  },
];

describe("roundRobinReassignment test", () => {
  setupAndTeardown();

  beforeEach(() => {
    // Set up default mock for BookingEventHandlerService
    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as unknown as BookingEventHandlerService);
  });

  test("reassign new round robin organizer", async ({ emails }) => {
    const roundRobinReassignment = (await import("./roundRobinReassignment")).default;
    const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype as any, "reschedule");
    // Clear any existing mock calls from previous tests
    eventManagerSpy.mockClear();
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
      orgId: null,
      reassignedById: originalHost.id,
      actionSource: "WEBAPP",
      reassignedByUuid: originalHost.uuid,
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
    // Clear any existing mock calls from previous tests
    eventManagerSpy.mockClear();

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
      orgId: null,
      reassignedById: fixedHost.id,
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

  test("should not expose other attendees in updated email when seatsShowAttendees is disabled for seated round-robin event", async ({
    emails,
  }) => {
    const roundRobinReassignment = (await import("./roundRobinReassignment")).default;
    const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype as any, "reschedule");
    eventManagerSpy.mockClear();
    eventManagerSpy.mockResolvedValue({ referencesToCreate: [] });

    const users = testUsers;
    const originalHost = users[0];
    const newHost = users[1];

    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });
    const { dateString: dateStringMinusOne } = getDate({ dateIncrement: -1 });

    const bookingToReassignUid = "seated-booking-to-reassign";
    const attendee1Email = "attendee1@test.com";
    const attendee2Email = "attendee2@test.com";
    const attendee3Email = "attendee3@test.com";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slug: "round-robin-seated-event",
            schedulingType: SchedulingType.ROUND_ROBIN,
            length: 45,
            seatsPerTimeSlot: 5,
            seatsShowAttendees: false,
            users: users.map((user) => ({ id: user.id })),
            hosts: users.map((user) => ({ userId: user.id, isFixed: false })),
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
              {
                ...getMockBookingAttendee({
                  id: 2,
                  name: "Attendee 1",
                  email: attendee1Email,
                  locale: "en",
                  timeZone: "Asia/Kolkata",
                }),
                bookingSeat: {
                  referenceUid: uuidv4(),
                  data: {},
                },
              },
              {
                ...getMockBookingAttendee({
                  id: 3,
                  name: "Attendee 2",
                  email: attendee2Email,
                  locale: "en",
                  timeZone: "Asia/Kolkata",
                }),
                bookingSeat: {
                  referenceUid: uuidv4(),
                  data: {},
                },
              },
              {
                ...getMockBookingAttendee({
                  id: 4,
                  name: "Attendee 3",
                  email: attendee3Email,
                  locale: "en",
                  timeZone: "Asia/Kolkata",
                }),
                bookingSeat: {
                  referenceUid: uuidv4(),
                  data: {},
                },
              },
            ],
          },
          {
            id: 456,
            eventTypeId: 1,
            userId: users[2].id,
            uid: "other-booking",
            status: BookingStatus.ACCEPTED,
            startTime: `${dateStringMinusOne}T05:00:00.000Z`,
            endTime: `${dateStringMinusOne}T05:15:00.000Z`,
            attendees: [
              getMockBookingAttendee({
                id: 5,
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

    await roundRobinReassignment({
      bookingId: 123,
      orgId: null,
      reassignedById: originalHost.id,
      actionSource: "WEBAPP",
      reassignedByUuid: originalHost.uuid,
    });

    expect(eventManagerSpy).toBeCalledTimes(1);

    // Verify that updated emails were sent to all attendees
    const updatedEmails = emails.get().filter((email) => {
      const subject = email.subject || "";
      return subject.includes("updated") || subject.includes("event_type_has_been_updated");
    });

    // Check that each attendee received an email
    expect(updatedEmails.some((email) => email.to.includes(attendee1Email))).toBe(true);
    expect(updatedEmails.some((email) => email.to.includes(attendee2Email))).toBe(true);
    expect(updatedEmails.some((email) => email.to.includes(attendee3Email))).toBe(true);

    // Verify that each attendee's email does not contain other attendees' information
    const attendee1EmailContent = updatedEmails.find((email) => email.to.includes(attendee1Email));
    if (attendee1EmailContent) {
      const emailHtml = parse(attendee1EmailContent.html);
      const emailText = emailHtml.innerText;

      // Should not contain other attendees' emails or names
      expect(emailText).not.toContain(attendee2Email);
      expect(emailText).not.toContain(attendee3Email);
      expect(emailText).not.toContain("Attendee 2");
      expect(emailText).not.toContain("Attendee 3");
      // Should contain their own info
      expect(emailText).toContain("Attendee 1");
    }

    const attendee2EmailContent = updatedEmails.find((email) => email.to.includes(attendee2Email));
    if (attendee2EmailContent) {
      const emailHtml = parse(attendee2EmailContent.html);
      const emailText = emailHtml.innerText;

      // Should not contain other attendees' emails or names
      expect(emailText).not.toContain(attendee1Email);
      expect(emailText).not.toContain(attendee3Email);
      expect(emailText).not.toContain("Attendee 1");
      expect(emailText).not.toContain("Attendee 3");
      // Should contain their own info
      expect(emailText).toContain("Attendee 2");
    }

    const attendee3EmailContent = updatedEmails.find((email) => email.to.includes(attendee3Email));
    if (attendee3EmailContent) {
      const emailHtml = parse(attendee3EmailContent.html);
      const emailText = emailHtml.innerText;

      // Should not contain other attendees' emails or names
      expect(emailText).not.toContain(attendee1Email);
      expect(emailText).not.toContain(attendee2Email);
      expect(emailText).not.toContain("Attendee 1");
      expect(emailText).not.toContain("Attendee 2");
      // Should contain their own info
      expect(emailText).toContain("Attendee 3");
    }
  });
});

describe("roundRobinReassignment - Audit Data Verification", () => {
  setupAndTeardown();

  test("should call BookingEventHandlerService.onReassignment with correct audit data when organizer changes", async () => {
    const roundRobinReassignment = (await import("./roundRobinReassignment")).default;
    const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype as any, "reschedule");
    eventManagerSpy.mockClear();
    eventManagerSpy.mockResolvedValue({ referencesToCreate: [] });

    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as any);

    const users = testUsers;
    const originalHost = users[0];
    const newHost = users[1];
    const reassigningUser = users[0]; // originalHost is doing the reassignment

    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });
    const { dateString: dateStringMinusOne } = getDate({ dateIncrement: -1 });
    const { dateString: dateStringPlusTwo } = getDate({ dateIncrement: 2 });

    const bookingToReassignUid = "booking-audit-test";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slug: "round-robin-event",
            schedulingType: SchedulingType.ROUND_ROBIN,
            length: 45,
            users: users.map((user) => ({ id: user.id })),
            hosts: users.map((user) => ({ userId: user.id, isFixed: false })),
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
            uid: "other-booking",
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

    await roundRobinReassignment({
      bookingId: 123,
      orgId: null,
      reassignedById: reassigningUser.id,
      actionSource: "WEBAPP",
      reassignedByUuid: reassigningUser.uuid,
    });

    expect(mockOnReassignment).toHaveBeenCalledTimes(1);
    expect(mockOnReassignment).toHaveBeenCalledWith({
      bookingUid: bookingToReassignUid,
      actor: { identifiedBy: "user", userUuid: reassigningUser.uuid },
      organizationId: null,
      source: "WEBAPP",
      auditData: {
        organizerUuid: { old: originalHost.uuid, new: newHost.uuid },
        reassignmentReason: null,
        reassignmentType: "roundRobin",
      },
    });
  });

  test("should call BookingEventHandlerService.onReassignment with correct audit data when only attendee changes (fixed host scenario)", async () => {
    const roundRobinReassignment = (await import("./roundRobinReassignment")).default;
    const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype as any, "reschedule");
    eventManagerSpy.mockClear();
    eventManagerSpy.mockResolvedValue({ referencesToCreate: [] });

    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as any);

    const users = testUsers;
    const fixedHost = users[0];
    const currentRRHost = users[1];
    const newHost = users[2];
    const reassigningUser = fixedHost;

    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });

    const bookingToReassignUid = "booking-audit-fixed-host-test";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slug: "round-robin-event",
            schedulingType: SchedulingType.ROUND_ROBIN,
            length: 45,
            users: users.map((user) => ({ id: user.id })),
            hosts: users.map((user) => ({
              userId: user.id,
              isFixed: user.id === fixedHost.id,
            })),
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
      orgId: null,
      reassignedById: reassigningUser.id,
      actionSource: "WEBAPP",
      reassignedByUuid: reassigningUser.uuid,
    });

    expect(mockOnReassignment).toHaveBeenCalledTimes(1);
    const callArgs = mockOnReassignment.mock.calls[0][0];
    expect(callArgs.bookingUid).toBe(bookingToReassignUid);
    expect(callArgs.actor).toEqual({ identifiedBy: "user", userUuid: reassigningUser.uuid });
    expect(callArgs.organizationId).toBe(null);
    expect(callArgs.source).toBe("WEBAPP");
    // organizerUuid should NOT be included when organizer hasn't changed (fixed host scenario)
    expect(callArgs.auditData.organizerUuid).toBeUndefined();
    expect(callArgs.auditData.reassignmentType).toBe("roundRobin");
    expect(callArgs.auditData.reassignmentReason).toBe(null);
    expect(callArgs.auditData.hostAttendeeUpdated).toBeDefined();
    expect(callArgs.auditData.hostAttendeeUpdated?.withUserUuid).toEqual({
      old: currentRRHost.uuid,
      new: newHost.uuid,
    });
  });
});
