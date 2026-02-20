import { describe, it, vi, expect, beforeAll, afterAll, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

const mockEventManagerCreate = vi.fn().mockResolvedValue({ referencesToCreate: [] });
const mockEventManagerDelete = vi.fn().mockResolvedValue({});

vi.mock("@calcom/features/bookings/lib/EventManager", () => ({
  default: class MockEventManager {
    create = mockEventManagerCreate;
    deleteEventsAndMeetings = mockEventManagerDelete;
  },
}));

vi.mock("@calcom/emails/email-manager");

let testTeamId: number;
const userIds: number[] = [];
const eventTypeIds: number[] = [];
const bookingIds: number[] = [];

const mockEventManager = async () => {
  mockEventManagerCreate.mockResolvedValue({ referencesToCreate: [] });
  mockEventManagerDelete.mockResolvedValue({});
};

const mockEmails = async () => {
  const emails = await import("@calcom/emails/email-manager");
  vi.spyOn(emails, "sendReassignedScheduledEmailsAndSMS").mockResolvedValue(undefined);
  vi.spyOn(emails, "sendReassignedEmailsAndSMS").mockResolvedValue(undefined);
  vi.spyOn(emails, "sendReassignedUpdatedEmailsAndSMS").mockResolvedValue(undefined);
};

const createTestUser = async (userData: { email: string; name: string; username: string }) => {
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      username: userData.username,
      timeZone: "UTC",
      schedules: {
        create: {
          name: "Default Schedule",
          timeZone: "UTC",
          availability: {
            create: [
              {
                days: [0, 1, 2, 3, 4, 5, 6],
                startTime: new Date("1970-01-01T09:00:00.000Z"),
                endTime: new Date("1970-01-01T17:00:00.000Z"),
              },
            ],
          },
        },
      },
    },
  });
  userIds.push(user.id);
  return user;
};

const createManagedEventStructure = async (params: {
  teamId: number;
  users: { id: number; username: string | null }[];
}) => {
  const { teamId, users } = params;

  const parentEventType = await prisma.eventType.create({
    data: {
      title: "Managed Event Parent",
      slug: "managed-event-parent",
      length: 30,
      schedulingType: SchedulingType.MANAGED,
      teamId,
    },
  });
  eventTypeIds.push(parentEventType.id);

  const childEventTypes = await Promise.all(
    users.map(async (user) => {
      const username = user.username || `user-${user.id}`;
      const child = await prisma.eventType.create({
        data: {
          title: `${username} Event`,
          slug: `${username}-event`,
          length: 30,
          userId: user.id,
          parentId: parentEventType.id,
        },
      });
      eventTypeIds.push(child.id);
      return child;
    })
  );

  return { parentEventType, childEventTypes };
};

const createTestBooking = async (params: {
  eventTypeId: number;
  userId: number;
  startTime: Date;
  endTime: Date;
}) => {
  const idempotencyKey = `test-idempotency-${Date.now()}-${Math.random()}`;
  const booking = await prisma.booking.create({
    data: {
      uid: `test-booking-${Date.now()}-${Math.random()}`,
      title: "Test Booking",
      idempotencyKey,
      startTime: params.startTime,
      endTime: params.endTime,
      eventTypeId: params.eventTypeId,
      userId: params.userId,
      status: BookingStatus.ACCEPTED,
      attendees: {
        create: [
          {
            name: "Test Attendee",
            email: "attendee@test.com",
            timeZone: "UTC",
          },
        ],
      },
    },
  });
  bookingIds.push(booking.id);
  return booking;
};

beforeAll(async () => {
  await mockEventManager();
  await mockEmails();

  const team = await prisma.team.create({
    data: {
      name: "Test Team Auto",
      slug: "test-team-auto",
    },
  });
  testTeamId = team.id;
});

afterEach(async () => {
  // Clean up all test bookings, including those created by reassignment
  // We query by eventTypeId to catch both original bookings and reassignment-created bookings
  const testBookings = await prisma.booking.findMany({
    where: {
      OR: [
        { uid: { startsWith: "test-booking-" } },
        { eventTypeId: { in: eventTypeIds } },
        { userId: { in: userIds } },
      ],
    },
    select: { id: true },
  });

  const testBookingIds = testBookings.map((b) => b.id);

  if (testBookingIds.length > 0) {
    await prisma.bookingReference.deleteMany({
      where: { bookingId: { in: testBookingIds } },
    });
    await prisma.attendee.deleteMany({
      where: { bookingId: { in: testBookingIds } },
    });
    await prisma.assignmentReason.deleteMany({
      where: { bookingId: { in: testBookingIds } },
    });
    await prisma.booking.deleteMany({
      where: { id: { in: testBookingIds } },
    });
  }

  bookingIds.splice(0, bookingIds.length);

  if (eventTypeIds.length > 0) {
    await prisma.eventType.deleteMany({
      where: { id: { in: eventTypeIds } },
    });
    eventTypeIds.splice(0, eventTypeIds.length);
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    userIds.splice(0, userIds.length);
  }
});

afterAll(async () => {
  if (testTeamId) {
    await prisma.team.delete({
      where: { id: testTeamId },
    });
  }
});

describe("managedEventReassignment - Integration Tests", () => {
  it("should auto-reassign booking to available user using LuckyUser algorithm", async () => {
    const managedEventReassignment = (await import("./managedEventReassignment")).default;

    const user1 = await createTestUser({
      email: "user1@test.com",
      name: "User 1",
      username: "user1",
    });
    const user2 = await createTestUser({
      email: "user2@test.com",
      name: "User 2",
      username: "user2",
    });
    const user3 = await createTestUser({
      email: "user3@test.com",
      name: "User 3",
      username: "user3",
    });

    await prisma.membership.createMany({
      data: [
        { teamId: testTeamId, userId: user1.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: user2.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: user3.id, accepted: true, role: "MEMBER" },
      ],
    });

    const { childEventTypes } = await createManagedEventStructure({
      teamId: testTeamId,
      users: [
        { id: user1.id, username: user1.username! },
        { id: user2.id, username: user2.username! },
        { id: user3.id, username: user3.username! },
      ],
    });

    // Schedule booking tomorrow at 10am UTC (within 9am-5pm availability window)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const startTime = tomorrow;
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const originalBooking = await createTestBooking({
      eventTypeId: childEventTypes[0].id,
      userId: user1.id,
      startTime,
      endTime,
    });

    await managedEventReassignment({
      bookingId: originalBooking.id,
      reassignedById: user1.id,
      orgId: null,
      emailsEnabled: false,
    });

    // Verify original booking is cancelled
    const cancelledBooking = await prisma.booking.findUnique({
      where: { id: originalBooking.id },
    });
    expect(cancelledBooking?.status).toBe(BookingStatus.CANCELLED);

    // Verify a new booking was created for another user
    const newBooking = await prisma.booking.findFirst({
      where: {
        userId: { not: user1.id },
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
      },
    });

    expect(newBooking).toBeTruthy();
    expect([user2.id, user3.id]).toContain(newBooking?.userId);
  });

  it("should record auto-reassignment reason", async () => {
    const managedEventReassignment = (await import("./managedEventReassignment")).default;

    const user1 = await createTestUser({
      email: "user1-reason@test.com",
      name: "User 1 Reason",
      username: "user1-reason",
    });
    const user2 = await createTestUser({
      email: "user2-reason@test.com",
      name: "User 2 Reason",
      username: "user2-reason",
    });

    await prisma.membership.createMany({
      data: [
        { teamId: testTeamId, userId: user1.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: user2.id, accepted: true, role: "MEMBER" },
      ],
    });

    const { childEventTypes } = await createManagedEventStructure({
      teamId: testTeamId,
      users: [
        { id: user1.id, username: user1.username! },
        { id: user2.id, username: user2.username! },
      ],
    });

    // Schedule booking tomorrow at 10am UTC (within 9am-5pm availability window)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const startTime = tomorrow;
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const originalBooking = await createTestBooking({
      eventTypeId: childEventTypes[0].id,
      userId: user1.id,
      startTime,
      endTime,
    });

    await managedEventReassignment({
      bookingId: originalBooking.id,
      reassignedById: user1.id,
      orgId: null,
      emailsEnabled: false,
    });

    const assignmentReason = await prisma.assignmentReason.findFirst({
      where: {
        booking: {
          userId: user2.id,
          startTime,
        },
      },
    });

    expect(assignmentReason).toBeTruthy();
    expect(assignmentReason?.reasonString).toContain("Auto-reassigned");
  });

  it("should call email functions when emailsEnabled is true", async () => {
    const managedEventReassignment = (await import("./managedEventReassignment")).default;
    const emails = await import("@calcom/emails/email-manager");

    const user1 = await createTestUser({
      email: "user1-email@test.com",
      name: "User 1 Email Test",
      username: "user1-email",
    });
    const user2 = await createTestUser({
      email: "user2-email@test.com",
      name: "User 2 Email Test",
      username: "user2-email",
    });

    await prisma.membership.createMany({
      data: [
        { teamId: testTeamId, userId: user1.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: user2.id, accepted: true, role: "MEMBER" },
      ],
    });

    const { childEventTypes } = await createManagedEventStructure({
      teamId: testTeamId,
      users: [
        { id: user1.id, username: user1.username! },
        { id: user2.id, username: user2.username! },
      ],
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const startTime = tomorrow;
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const originalBooking = await createTestBooking({
      eventTypeId: childEventTypes[0].id,
      userId: user1.id,
      startTime,
      endTime,
    });

    await managedEventReassignment({
      bookingId: originalBooking.id,
      reassignedById: user1.id,
      orgId: null,
      emailsEnabled: true,
    });

    expect(emails.sendReassignedScheduledEmailsAndSMS).toHaveBeenCalledTimes(1);
    expect(emails.sendReassignedEmailsAndSMS).toHaveBeenCalledTimes(1);
    expect(emails.sendReassignedUpdatedEmailsAndSMS).toHaveBeenCalledTimes(1);

    const newBooking = await prisma.booking.findFirst({
      where: { userId: user2.id, startTime },
    });

    expect(newBooking).toBeTruthy();
    expect(newBooking?.userId).toBe(user2.id);
  });

  it("should throw error when booking does not exist", async () => {
    const managedEventReassignment = (await import("./managedEventReassignment")).default;

    const user1 = await createTestUser({
      email: "user1-error@test.com",
      name: "User 1 Error",
      username: "user1-error",
    });

    await expect(
      managedEventReassignment({
        bookingId: 999999, // Non-existent booking ID
        reassignedById: user1.id,
        orgId: null,
        emailsEnabled: false,
      })
    ).rejects.toThrow();
  });
});
