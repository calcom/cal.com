import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import type { BookingAuditTaskConsumer } from "./BookingAuditTaskConsumer";
import type { BookingAuditViewerService } from "./BookingAuditViewerService";
import { makeUserActor } from "../../../bookings/lib/types/actor";
import { getBookingAuditTaskConsumer } from "../../di/BookingAuditTaskConsumer.container";
import { getBookingAuditViewerService } from "../../di/BookingAuditViewerService.container";

/**
 * Integration tests for booking audit system
 * Tests the complete write-read cycle using real database
 */
describe("Booking Audit Integration", () => {
  let bookingAuditTaskConsumer: BookingAuditTaskConsumer;
  let bookingAuditViewerService: BookingAuditViewerService;

  // Test data holders
  let testUserId: number;
  let testUserUuid: string;
  let testUserEmail: string;
  let testBookingUid: string;
  let testEventTypeId: number;
  let testAttendeeEmail: string;
  let testAttendeeUserId: number;
  let testOrganizationId: number;

  beforeEach(async () => {
    // Initialize services from DI containers
    bookingAuditTaskConsumer = getBookingAuditTaskConsumer();
    bookingAuditViewerService = getBookingAuditViewerService();

    // Create test user
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const testUser = await prisma.user.create({
      data: {
        email: `test-audit-user-${timestamp}-${randomSuffix}@example.com`,
        username: `testaudituser-${timestamp}-${randomSuffix}`,
        name: "Test Audit User",
      },
    });
    testUserId = testUser.id;
    testUserUuid = testUser.uuid;
    testUserEmail = testUser.email;

    // Create test organization
    const organization = await prisma.team.create({
      data: {
        name: `Test Org ${timestamp}-${randomSuffix}`,
        slug: `test-org-${timestamp}-${randomSuffix}`,
        isOrganization: true,
      },
    });
    testOrganizationId = organization.id;

    // Add user as admin of the organization
    await prisma.membership.create({
      data: {
        userId: testUserId,
        teamId: testOrganizationId,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });

    // Create test event type
    const eventType = await prisma.eventType.create({
      data: {
        title: "Test Event Type",
        slug: `test-event-${timestamp}-${randomSuffix}`,
        length: 60,
        userId: testUserId,
      },
    });
    testEventTypeId = eventType.id;

    // Create test attendee user for permission tests (needed before booking creation)
    const attendeeUser = await prisma.user.create({
      data: {
        email: `test-attendee-${timestamp}-${randomSuffix}@example.com`,
        username: `testattendee-${timestamp}-${randomSuffix}`,
        name: "Test Attendee",
      },
    });
    testAttendeeUserId = attendeeUser.id;
    testAttendeeEmail = attendeeUser.email;

    // Create test booking with attendee in single atomic operation
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    testBookingUid = `test-booking-${timestamp}-${randomSuffix}`;

    await prisma.booking.create({
      data: {
        uid: testBookingUid,
        title: "Test Booking",
        startTime,
        endTime,
        userId: testUserId,
        eventTypeId: testEventTypeId,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: [
            {
              email: testAttendeeEmail,
              name: "Test Attendee",
              timeZone: "UTC",
            },
          ],
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order to respect foreign key constraints

    // Delete audit logs first (references actor)
    if (testBookingUid) {
      await prisma.bookingAudit.deleteMany({
        where: { bookingUid: testBookingUid },
      });
    }

    // Delete actors
    if (testUserUuid || testAttendeeEmail) {
      await prisma.auditActor.deleteMany({
        where: {
          OR: [
            ...(testUserUuid ? [{ userUuid: testUserUuid }] : []),
            ...(testAttendeeEmail ? [{ email: testAttendeeEmail }] : []),
          ],
        },
      });
    }

    // Delete attendees
    if (testAttendeeEmail) {
      await prisma.attendee.deleteMany({
        where: { email: testAttendeeEmail },
      });
    }

    // Delete booking
    if (testBookingUid) {
      await prisma.booking.deleteMany({
        where: { uid: testBookingUid },
      });
    }

    // Delete event type
    if (testEventTypeId) {
      await prisma.eventType.deleteMany({
        where: { id: testEventTypeId },
      });
    }

    // Delete memberships
    if (testOrganizationId) {
      await prisma.membership.deleteMany({
        where: { teamId: testOrganizationId },
      });
    }

    // Delete organization
    if (testOrganizationId) {
      await prisma.team.deleteMany({
        where: { id: testOrganizationId },
      });
    }

    // Delete users
    if (testUserId || testAttendeeUserId) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [testUserId, testAttendeeUserId].filter(Boolean),
          },
        },
      });
    }
  });

  describe("CREATED action end-to-end flow", () => {
    it("should create audit record and retrieve it with correct formatting", async () => {
      // Arrange: Get booking details
      const booking = await prisma.booking.findUnique({
        where: { uid: testBookingUid },
        select: {
          startTime: true,
          endTime: true,
          status: true,
        },
      });

      expect(booking).toBeDefined();

      // Create actor using helper
      const actor = makeUserActor(testUserUuid);

      // Act: Create audit record using TaskConsumer
      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testBookingUid,
        actor,
        action: "CREATED",
        source: "WEBAPP",
        data: {
          startTime: booking!.startTime.getTime(),
          endTime: booking!.endTime.getTime(),
          status: booking!.status,
        },
        timestamp: Date.now(),
      });

      // Retrieve audit logs
      const result = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testBookingUid,
        userId: testUserId,
        userEmail: testUserEmail,
        userTimeZone: "UTC",
        organizationId: testOrganizationId,
      });

      // Assert: Verify audit log exists and has correct data
      expect(result.bookingUid).toBe(testBookingUid);
      expect(result.auditLogs).toHaveLength(1);

      const auditLog = result.auditLogs[0];
      expect(auditLog.bookingUid).toBe(testBookingUid);
      expect(auditLog.action).toBe("CREATED");
      expect(auditLog.type).toBe("RECORD_CREATED");

      // Verify audit data matches (getDisplayJson returns formatted display data)
      // Format is "yyyy-MM-dd HH:mm:ss" in the user's timezone (UTC in this test)
      const displayData = auditLog.displayJson as any;
      expect(displayData).toBeDefined();
      expect(displayData.startTime).toBeDefined();
      expect(typeof displayData.startTime).toBe("string");
      // Verify format matches "yyyy-MM-dd HH:mm:ss" pattern
      expect(displayData.startTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

      expect(displayData.endTime).toBeDefined();
      expect(typeof displayData.endTime).toBe("string");
      expect(displayData.endTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

      expect(displayData.status).toBe(booking!.status);
    });

    it("should enrich actor information with user details", async () => {
      // Arrange: Get booking details
      const booking = await prisma.booking.findUnique({
        where: { uid: testBookingUid },
        select: { startTime: true, endTime: true, status: true },
      });

      // Create actor using helper
      const actor = makeUserActor(testUserUuid);

      // Create audit record using TaskConsumer
      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testBookingUid,
        actor,
        action: "CREATED",
        source: "WEBAPP",
        data: {
          startTime: booking!.startTime.getTime(),
          endTime: booking!.endTime.getTime(),
          status: booking!.status,
        },
        timestamp: Date.now(),
      });

      // Act: Retrieve audit logs
      const result = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testBookingUid,
        userId: testUserId,
        userEmail: testUserEmail,
        userTimeZone: "UTC",
        organizationId: testOrganizationId,
      });

      // Assert: Verify actor enrichment
      const auditLog = result.auditLogs[0];
      expect(auditLog.actor.displayName).toBe("Test Audit User");
      expect(auditLog.actor.displayEmail).toBe(testUserEmail);
      expect(auditLog.actor.userUuid).toBe(testUserUuid);
    });

    it.skip("should enforce permission checks correctly", async () => {
      // Arrange: Get booking details
      const booking = await prisma.booking.findUnique({
        where: { uid: testBookingUid },
        select: { startTime: true, endTime: true, status: true },
      });

      // Create actor using helper
      const actor = makeUserActor(testUserUuid);

      // Create audit record using TaskConsumer
      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testBookingUid,
        actor,
        action: "CREATED",
        source: "WEBAPP",
        data: {
          startTime: booking!.startTime.getTime(),
          endTime: booking!.endTime.getTime(),
          status: booking!.status,
        },
        timestamp: Date.now(),
      });

      // Act & Assert: Booking owner (org admin) can view
      const ownerResult = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testBookingUid,
        userId: testUserId,
        userEmail: testUserEmail,
        userTimeZone: "UTC",
        organizationId: testOrganizationId,
      });
      expect(ownerResult.auditLogs).toHaveLength(1);

      // Act & Assert: Unauthorized user cannot view
      const unauthorizedUserId = 999999;
      const unauthorizedEmail = "unauthorized@example.com";

      await expect(
        bookingAuditViewerService.getAuditLogsForBooking({
          bookingUid: testBookingUid,
          userId: unauthorizedUserId,
          userEmail: unauthorizedEmail,
          userTimeZone: "UTC",
          organizationId: testOrganizationId,
        })
      ).rejects.toThrow();
    });
  });
});

