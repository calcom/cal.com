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

  // Create parent event type (MANAGED)
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

  // Create child event types (one per user)
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
  const uniqueId = `test-idempotency-${Date.now()}-${Math.random()}`;
  const booking = await prisma.booking.create({
    data: {
      uid: `test-booking-${uniqueId}`,
      idempotencyKey: `test-idempotency-${uniqueId}`,
      title: "Test Booking",
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

  // Create test team
  const team = await prisma.team.create({
    data: {
      name: "Test Team",
      slug: "test-team",
    },
  });
  testTeamId = team.id;
});

afterEach(async () => {
  // Clean up bookings
  if (bookingIds.length > 0) {
    await prisma.bookingReference.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await prisma.attendee.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await prisma.assignmentReason.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await prisma.booking.deleteMany({
      where: { id: { in: bookingIds } },
    });
    bookingIds.splice(0, bookingIds.length);
  }

  // Clean up event types
  if (eventTypeIds.length > 0) {
    await prisma.eventType.deleteMany({
      where: { id: { in: eventTypeIds } },
    });
    eventTypeIds.splice(0, eventTypeIds.length);
  }

  // Clean up users
  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    userIds.splice(0, userIds.length);
  }
});

afterAll(async () => {
  // Clean up team
  if (testTeamId) {
    await prisma.team.delete({
      where: { id: testTeamId },
    });
  }
});

describe("managedEventManualReassignment - Integration Tests", () => {
  it("should reassign booking from one user to another within managed event", async () => {
    const managedEventManualReassignment = (await import("./managedEventManualReassignment")).default;

    // Create users
    const originalUser = await createTestUser({
      email: "original@test.com",
      name: "Original User",
      username: "original-user",
    });
    const newUser = await createTestUser({
      email: "new@test.com",
      name: "New User",
      username: "new-user",
    });

    // Add users to team
    await prisma.membership.createMany({
      data: [
        { teamId: testTeamId, userId: originalUser.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: newUser.id, accepted: true, role: "MEMBER" },
      ],
    });

    // Create managed event structure
    const { childEventTypes } = await createManagedEventStructure({
      teamId: testTeamId,
      users: [
        { id: originalUser.id, username: originalUser.username! },
        { id: newUser.id, username: newUser.username! },
      ],
    });

    // Create booking for original user - schedule tomorrow at 10am UTC (within 9am-5pm availability window)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const startTime = tomorrow;
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const originalBooking = await createTestBooking({
      eventTypeId: childEventTypes[0].id,
      userId: originalUser.id,
      startTime,
      endTime,
    });

    // Perform reassignment
    await managedEventManualReassignment({
      bookingId: originalBooking.id,
      newUserId: newUser.id,
      reassignedById: originalUser.id,
      orgId: null,
      emailsEnabled: false,
      isAutoReassignment: false,
    });

    // Verify original booking is cancelled
    const cancelledBooking = await prisma.booking.findUnique({
      where: { id: originalBooking.id },
    });
    expect(cancelledBooking?.status).toBe(BookingStatus.CANCELLED);

    // Verify new booking was created for new user
    const newBooking = await prisma.booking.findFirst({
      where: {
        eventTypeId: childEventTypes[1].id,
        userId: newUser.id,
        status: BookingStatus.ACCEPTED,
      },
    });
    expect(newBooking).toBeTruthy();
    expect(newBooking?.eventTypeId).toBe(childEventTypes[1].id);
    expect(newBooking?.userId).toBe(newUser.id);

    // Verify new booking has different UID
    expect(newBooking?.uid).not.toBe(originalBooking.uid);
  });

  it("should record assignment reason for manual reassignment", async () => {
    const managedEventManualReassignment = (await import("./managedEventManualReassignment")).default;

    await prisma.booking.deleteMany({
      where: {
        idempotencyKey: { startsWith: "test-idempotency-" },
      },
    });

    const originalUser = await createTestUser({
      email: "original2@test.com",
      name: "Original User 2",
      username: "original-user-2",
    });
    const newUser = await createTestUser({
      email: "new2@test.com",
      name: "New User 2",
      username: "new-user-2",
    });

    await prisma.membership.createMany({
      data: [
        { teamId: testTeamId, userId: originalUser.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: newUser.id, accepted: true, role: "MEMBER" },
      ],
    });

    const { childEventTypes } = await createManagedEventStructure({
      teamId: testTeamId,
      users: [
        { id: originalUser.id, username: originalUser.username! },
        { id: newUser.id, username: newUser.username! },
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
      userId: originalUser.id,
      startTime,
      endTime,
    });

    const reassignReason = "User requested different host";

    await managedEventManualReassignment({
      bookingId: originalBooking.id,
      newUserId: newUser.id,
      reassignedById: originalUser.id,
      reassignReason,
      orgId: null,
      emailsEnabled: false,
      isAutoReassignment: false,
    });

    // Verify assignment reason was recorded
    const assignmentReason = await prisma.assignmentReason.findFirst({
      where: {
        booking: {
          eventTypeId: childEventTypes[1].id,
          userId: newUser.id,
        },
      },
    });

    expect(assignmentReason).toBeTruthy();
    expect(assignmentReason?.reasonString).toContain("Manual-reassigned");
    expect(assignmentReason?.reasonString).toContain(reassignReason);
  });

  it("should preserve booking details (attendees, time) during reassignment", async () => {
    const managedEventManualReassignment = (await import("./managedEventManualReassignment")).default;

    await prisma.booking.deleteMany({
      where: {
        idempotencyKey: { startsWith: "test-idempotency-" },
      },
    });

    const originalUser = await createTestUser({
      email: "original3@test.com",
      name: "Original User 3",
      username: "original-user-3",
    });
    const newUser = await createTestUser({
      email: "new3@test.com",
      name: "New User 3",
      username: "new-user-3",
    });

    await prisma.membership.createMany({
      data: [
        { teamId: testTeamId, userId: originalUser.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: newUser.id, accepted: true, role: "MEMBER" },
      ],
    });

    const { childEventTypes } = await createManagedEventStructure({
      teamId: testTeamId,
      users: [
        { id: originalUser.id, username: originalUser.username! },
        { id: newUser.id, username: newUser.username! },
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
      userId: originalUser.id,
      startTime,
      endTime,
    });

    await managedEventManualReassignment({
      bookingId: originalBooking.id,
      newUserId: newUser.id,
      reassignedById: originalUser.id,
      orgId: null,
      emailsEnabled: false,
      isAutoReassignment: false,
    });

    const newBooking = await prisma.booking.findFirst({
      where: {
        eventTypeId: childEventTypes[1].id,
        userId: newUser.id,
      },
      select: {
        startTime: true,
        endTime: true,
        attendees: {
          select: {
            email: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    expect(newBooking).toBeTruthy();
    // Verify time is preserved
    expect(newBooking?.startTime).toEqual(startTime);
    expect(newBooking?.endTime).toEqual(endTime);
    // Verify attendees are copied
    expect(newBooking?.attendees.length).toBe(1);
    expect(newBooking?.attendees[0].email).toBe("attendee@test.com");
  });

  it("should call email functions when emailsEnabled is true", async () => {
    const managedEventManualReassignment = (await import("./managedEventManualReassignment")).default;
    const emails = await import("@calcom/emails/email-manager");

    const originalUser = await createTestUser({
      email: "original5@test.com",
      name: "Original User 5",
      username: "original-user-5",
    });
    const newUser = await createTestUser({
      email: "new5@test.com",
      name: "New User 5",
      username: "new-user-5",
    });

    await prisma.membership.createMany({
      data: [
        { teamId: testTeamId, userId: originalUser.id, accepted: true, role: "MEMBER" },
        { teamId: testTeamId, userId: newUser.id, accepted: true, role: "MEMBER" },
      ],
    });

    const { childEventTypes } = await createManagedEventStructure({
      teamId: testTeamId,
      users: [
        { id: originalUser.id, username: originalUser.username! },
        { id: newUser.id, username: newUser.username! },
      ],
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const startTime = tomorrow;
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const originalBooking = await createTestBooking({
      eventTypeId: childEventTypes[0].id,
      userId: originalUser.id,
      startTime,
      endTime,
    });

    await managedEventManualReassignment({
      bookingId: originalBooking.id,
      newUserId: newUser.id,
      reassignedById: originalUser.id,
      orgId: null,
      emailsEnabled: true,
      isAutoReassignment: false,
    });

    // Verify email functions were called
    expect(emails.sendReassignedScheduledEmailsAndSMS).toHaveBeenCalledTimes(1);
    expect(emails.sendReassignedEmailsAndSMS).toHaveBeenCalledTimes(1);
    expect(emails.sendReassignedUpdatedEmailsAndSMS).toHaveBeenCalledTimes(1);

    const newBooking = await prisma.booking.findFirst({
      where: { userId: newUser.id, eventTypeId: childEventTypes[1].id },
    });
    
    expect(newBooking).toBeTruthy();
    expect(newBooking?.userId).toBe(newUser.id);
  });

  it("should throw error when booking does not exist", async () => {
    const managedEventManualReassignment = (await import("./managedEventManualReassignment")).default;

    const originalUser = await createTestUser({
      email: "original6@test.com",
      name: "Original User 6",
      username: "original-user-6",
    });
    const newUser = await createTestUser({
      email: "new6@test.com",
      name: "New User 6",
      username: "new-user-6",
    });

    await expect(
      managedEventManualReassignment({
        bookingId: 999999, // Non-existent booking ID
        newUserId: newUser.id,
        reassignedById: originalUser.id,
        orgId: null,
        emailsEnabled: false,
        isAutoReassignment: false,
      })
    ).rejects.toThrow();
  });
});

