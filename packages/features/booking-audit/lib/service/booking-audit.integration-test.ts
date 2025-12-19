import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import type { BookingAuditTaskConsumer } from "./BookingAuditTaskConsumer";
import type { BookingAuditViewerService } from "./BookingAuditViewerService";
import { makeUserActor } from "../../../bookings/lib/types/actor";
import { getBookingAuditTaskConsumer } from "../../di/BookingAuditTaskConsumer.container";
import { getBookingAuditViewerService } from "../../di/BookingAuditViewerService.container";

const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  return `${timestamp}-${randomSuffix}`;
};

const createTestUser = async (overrides?: { email?: string; username?: string; name?: string }) => {
  const uniqueId = generateUniqueId();
  return prisma.user.create({
    data: {
      email: overrides?.email || `test-user-${uniqueId}@example.com`,
      username: overrides?.username || `testuser-${uniqueId}`,
      name: overrides?.name || "Test User",
    },
  });
};

const createTestOrganization = async (overrides?: { name?: string; slug?: string }) => {
  const uniqueId = generateUniqueId();
  return prisma.team.create({
    data: {
      name: overrides?.name || `Test Org ${uniqueId}`,
      slug: overrides?.slug || `test-org-${uniqueId}`,
      isOrganization: true,
    },
  });
};

const createTestMembership = async (
  userId: number,
  teamId: number,
  overrides?: { role?: MembershipRole; accepted?: boolean }
) => {
  return prisma.membership.create({
    data: {
      userId,
      teamId,
      role: overrides?.role || MembershipRole.ADMIN,
      accepted: overrides?.accepted ?? true,
    },
  });
};

const createTestEventType = async (
  userId: number,
  overrides?: { title?: string; slug?: string; length?: number }
) => {
  const uniqueId = generateUniqueId();
  return prisma.eventType.create({
    data: {
      title: overrides?.title || "Test Event Type",
      slug: overrides?.slug || `test-event-${uniqueId}`,
      length: overrides?.length || 60,
      userId,
    },
  });
};

const createTestBooking = async (
  userId: number,
  eventTypeId: number,
  overrides?: {
    uid?: string;
    title?: string;
    startTime?: Date;
    endTime?: Date;
    status?: BookingStatus;
    attendees?: Array<{ email: string; name: string; timeZone: string }>;
  }
) => {
  const uniqueId = generateUniqueId();
  const startTime = overrides?.startTime || new Date();
  const endTime = overrides?.endTime || new Date(startTime.getTime() + 60 * 60 * 1000);

  return prisma.booking.create({
    data: {
      uid: overrides?.uid || `test-booking-${uniqueId}`,
      title: overrides?.title || "Test Booking",
      startTime,
      endTime,
      userId,
      eventTypeId,
      status: overrides?.status || BookingStatus.ACCEPTED,
      attendees: {
        create: overrides?.attendees || [],
      },
    },
  });
};

const enableFeatureForOrganization = async (organizationId: number, featureSlug: string) => {
  await prisma.feature.upsert({
    where: { slug: featureSlug },
    create: {
      slug: featureSlug,
      enabled: true,
      description: `Test feature: ${featureSlug}`,
    },
    update: {
      enabled: true,
    },
  });

  await prisma.teamFeatures.upsert({
    where: {
      teamId_featureId: {
        teamId: organizationId,
        featureId: featureSlug,
      },
    },
    create: {
      teamId: organizationId,
      featureId: featureSlug,
      assignedBy: "test-system",
      enabled: true,
    },
    update: {
      enabled: true,
    },
  });
};

const cleanupTestData = async (testData: {
  bookingUid?: string;
  userUuids?: string[];
  attendeeEmails?: string[];
  eventTypeId?: number;
  organizationId?: number;
  userIds?: number[];
  featureSlug?: string;
}) => {
  if (testData.bookingUid) {
    await prisma.bookingAudit.deleteMany({
      where: { bookingUid: testData.bookingUid },
    });
  }

  if (testData.userUuids?.length || testData.attendeeEmails?.length) {
    await prisma.auditActor.deleteMany({
      where: {
        OR: [
          ...(testData.userUuids?.map((uuid) => ({ userUuid: uuid })) || []),
          ...(testData.attendeeEmails?.map((email) => ({ email })) || []),
        ],
      },
    });
  }

  if (testData.attendeeEmails?.length) {
    await prisma.attendee.deleteMany({
      where: { email: { in: testData.attendeeEmails } },
    });
  }

  if (testData.bookingUid) {
    await prisma.booking.deleteMany({
      where: { uid: testData.bookingUid },
    });
  }

  if (testData.eventTypeId) {
    await prisma.eventType.deleteMany({
      where: { id: testData.eventTypeId },
    });
  }

  if (testData.organizationId) {
    if (testData.featureSlug) {
      await prisma.teamFeatures.deleteMany({
        where: {
          teamId: testData.organizationId,
          featureId: testData.featureSlug,
        },
      });
    }
    await prisma.membership.deleteMany({
      where: { teamId: testData.organizationId },
    });
    await prisma.team.deleteMany({
      where: { id: testData.organizationId },
    });
  }

  if (testData.userIds?.length) {
    await prisma.user.deleteMany({
      where: { id: { in: testData.userIds } },
    });
  }
};

describe("Booking Audit Integration", () => {
  let bookingAuditTaskConsumer: BookingAuditTaskConsumer;
  let bookingAuditViewerService: BookingAuditViewerService;

  let testData: {
    owner: { id: number; uuid: string; email: string };
    attendee: { id: number; email: string };
    organization: { id: number };
    eventType: { id: number };
    booking: { uid: string; startTime: Date; endTime: Date; status: BookingStatus };
  };

  beforeEach(async () => {
    bookingAuditTaskConsumer = getBookingAuditTaskConsumer();
    bookingAuditViewerService = getBookingAuditViewerService();

    const owner = await createTestUser({ name: "Test Audit User" });
    const organization = await createTestOrganization();
    await createTestMembership(owner.id, organization.id);
    await enableFeatureForOrganization(organization.id, "booking-audit");
    const eventType = await createTestEventType(owner.id);
    const attendee = await createTestUser({ name: "Test Attendee" });

    const booking = await createTestBooking(owner.id, eventType.id, {
      attendees: [
        {
          email: attendee.email,
          name: attendee.name || "Test Attendee",
          timeZone: "UTC",
        },
      ],
    });

    testData = {
      owner: { id: owner.id, uuid: owner.uuid, email: owner.email },
      attendee: { id: attendee.id, email: attendee.email },
      organization: { id: organization.id },
      eventType: { id: eventType.id },
      booking: {
        uid: booking.uid,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      },
    };
  });

  afterEach(async () => {
    if (!testData) return;

    await cleanupTestData({
      bookingUid: testData.booking?.uid,
      userUuids: testData.owner?.uuid ? [testData.owner.uuid] : [],
      attendeeEmails: testData.attendee?.email ? [testData.attendee.email] : [],
      eventTypeId: testData.eventType?.id,
      organizationId: testData.organization?.id,
      userIds: [testData.owner?.id, testData.attendee?.id].filter((id): id is number => id !== undefined),
      featureSlug: "booking-audit",
    });
  });

  describe("when single booking is created", () => {
    it("should create audit record and retrieve it with correct data formatting", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "CREATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          startTime: testData.booking.startTime.getTime(),
          endTime: testData.booking.endTime.getTime(),
          status: testData.booking.status,
        },
        timestamp: Date.now(),
      });

      const result = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testData.booking.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      expect(result.bookingUid).toBe(testData.booking.uid);
      expect(result.auditLogs).toHaveLength(1);

      const auditLog = result.auditLogs[0];
      expect(auditLog.bookingUid).toBe(testData.booking.uid);
      expect(auditLog.action).toBe("CREATED");
      expect(auditLog.type).toBe("RECORD_CREATED");

      const displayData = auditLog.displayJson as Record<string, unknown>;
      expect(displayData).toBeDefined();
      expect(displayData.startTime).toBeDefined();
      expect(typeof displayData.startTime).toBe("string");
      expect(displayData.startTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

      expect(displayData.endTime).toBeDefined();
      expect(typeof displayData.endTime).toBe("string");
      expect(displayData.endTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

      expect(displayData.status).toBe(testData.booking.status);
    });

    it("should enrich actor information with user details from database", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "CREATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          startTime: testData.booking.startTime.getTime(),
          endTime: testData.booking.endTime.getTime(),
          status: testData.booking.status,
        },
        timestamp: Date.now(),
      });

      const result = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testData.booking.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      const auditLog = result.auditLogs[0];
      expect(auditLog.actor.displayName).toBe("Test Audit User");
      expect(auditLog.actor.displayEmail).toBe(testData.owner.email);
      expect(auditLog.actor.userUuid).toBe(testData.owner.uuid);
    });

    it.skip("should deny access to unauthorized users viewing audit logs", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "CREATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          startTime: testData.booking.startTime.getTime(),
          endTime: testData.booking.endTime.getTime(),
          status: testData.booking.status,
        },
        timestamp: Date.now(),
      });

      const ownerResult = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testData.booking.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });
      expect(ownerResult.auditLogs).toHaveLength(1);

      const unauthorizedUserId = 999999;
      const unauthorizedEmail = "unauthorized@example.com";

      await expect(
        bookingAuditViewerService.getAuditLogsForBooking({
          bookingUid: testData.booking.uid,
          userId: unauthorizedUserId,
          userEmail: unauthorizedEmail,
          userTimeZone: "UTC",
          organizationId: testData.organization.id,
        })
      ).rejects.toThrow();
    });
  });

  describe("when multiple bookings are created in bulk", () => {
    it("should create audit records for all bookings with same operation ID", async () => {
      const booking2 = await createTestBooking(testData.owner.id, testData.eventType.id, {
        attendees: [
          {
            email: testData.attendee.email,
            name: "Test Attendee",
            timeZone: "UTC",
          },
        ],
      });

      const booking3 = await createTestBooking(testData.owner.id, testData.eventType.id, {
        attendees: [
          {
            email: testData.attendee.email,
            name: "Test Attendee",
            timeZone: "UTC",
          },
        ],
      });

      const actor = makeUserActor(testData.owner.uuid);
      const operationId = `bulk-op-${Date.now()}`;
      const timestamp = Date.now();

      await bookingAuditTaskConsumer.processBulkAuditTask(
        {
          bookings: [
            {
              bookingUid: testData.booking.uid,
              data: {
                startTime: testData.booking.startTime.getTime(),
                endTime: testData.booking.endTime.getTime(),
                status: testData.booking.status,
              },
            },
            {
              bookingUid: booking2.uid,
              data: {
                startTime: booking2.startTime.getTime(),
                endTime: booking2.endTime.getTime(),
                status: booking2.status,
              },
            },
            {
              bookingUid: booking3.uid,
              data: {
                startTime: booking3.startTime.getTime(),
                endTime: booking3.endTime.getTime(),
                status: booking3.status,
              },
            },
          ],
          actor,
          action: "CREATED",
          source: "WEBAPP",
          operationId,
          timestamp,
          organizationId: testData.organization.id,
        },
        "test-task-id"
      );

      const result1 = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testData.booking.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      const result2 = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: booking2.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      const result3 = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: booking3.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      expect(result1.auditLogs).toHaveLength(1);
      expect(result2.auditLogs).toHaveLength(1);
      expect(result3.auditLogs).toHaveLength(1);

      expect(result1.auditLogs[0].action).toBe("CREATED");
      expect(result2.auditLogs[0].action).toBe("CREATED");
      expect(result3.auditLogs[0].action).toBe("CREATED");

      // Verify all bookings share the same operationId
      expect(result1.auditLogs[0].operationId).toBe(operationId);
      expect(result2.auditLogs[0].operationId).toBe(operationId);
      expect(result3.auditLogs[0].operationId).toBe(operationId);

      await cleanupTestData({
        bookingUid: booking2.uid,
      });
      await cleanupTestData({
        bookingUid: booking3.uid,
      });
    });
  });
});
