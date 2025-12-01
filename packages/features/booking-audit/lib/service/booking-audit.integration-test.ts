import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

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

    // Create test booking
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
      },
    });

    // Create test attendee user for permission tests
    const attendeeUser = await prisma.user.create({
      data: {
        email: `test-attendee-${timestamp}-${randomSuffix}@example.com`,
        username: `testattendee-${timestamp}-${randomSuffix}`,
        name: "Test Attendee",
      },
    });
    testAttendeeUserId = attendeeUser.id;
    testAttendeeEmail = attendeeUser.email;

    // Add attendee to booking
    await prisma.attendee.create({
      data: {
        email: testAttendeeEmail,
        name: "Test Attendee",
        timeZone: "UTC",
        bookingId: (await prisma.booking.findUnique({ where: { uid: testBookingUid }, select: { id: true } }))!.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order to respect foreign key constraints

    // Delete audit logs first (references actor)
    await prisma.bookingAudit.deleteMany({
      where: { bookingUid: testBookingUid },
    });

    // Delete actors
    await prisma.auditActor.deleteMany({
      where: {
        OR: [
          { userUuid: testUserUuid },
          { email: testAttendeeEmail },
        ],
      },
    });

    // Delete attendees
    await prisma.attendee.deleteMany({
      where: { email: testAttendeeEmail },
    });

    // Delete booking
    await prisma.booking.deleteMany({
      where: { uid: testBookingUid },
    });

    // Delete event type
    await prisma.eventType.deleteMany({
      where: { id: testEventTypeId },
    });

    // Delete users
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUserId, testAttendeeUserId],
        },
      },
    });
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
      await bookingAuditTaskConsumer.onBookingCreated(
        testBookingUid,
        actor,
        {
          startTime: booking!.startTime.toISOString(),
          endTime: booking!.endTime.toISOString(),
          status: booking!.status,
        }
      );

      // Retrieve audit logs
      const result = await bookingAuditViewerService.getAuditLogsForBooking(
        testBookingUid,
        testUserId,
        testUserEmail,
        "en"
      );

      // Assert: Verify audit log exists and has correct data
      expect(result.bookingUid).toBe(testBookingUid);
      expect(result.auditLogs).toHaveLength(1);

      const auditLog = result.auditLogs[0];
      expect(auditLog.bookingUid).toBe(testBookingUid);
      expect(auditLog.action).toBe("CREATED");
      expect(auditLog.type).toBe("RECORD_CREATED");

      // Verify display formatting
      expect(auditLog.displaySummary).toBeDefined();
      expect(auditLog.displayDetails).toBeDefined();
      expect(typeof auditLog.displaySummary).toBe("string");
      expect(typeof auditLog.displayDetails).toBe("object");

      // Verify audit data matches
      const storedData = auditLog.data as { version: number; fields: { startTime: string; endTime: string; status: string } };
      expect(storedData.version).toBe(1);
      expect(storedData.fields.startTime).toBe(booking!.startTime.toISOString());
      expect(storedData.fields.endTime).toBe(booking!.endTime.toISOString());
      expect(storedData.fields.status).toBe(booking!.status);
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
      await bookingAuditTaskConsumer.onBookingCreated(
        testBookingUid,
        actor,
        {
          startTime: booking!.startTime.toISOString(),
          endTime: booking!.endTime.toISOString(),
          status: booking!.status,
        }
      );

      // Act: Retrieve audit logs
      const result = await bookingAuditViewerService.getAuditLogsForBooking(
        testBookingUid,
        testUserId,
        testUserEmail,
        "en"
      );

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
      await bookingAuditTaskConsumer.onBookingCreated(
        testBookingUid,
        actor,
        {
          startTime: booking!.startTime.toISOString(),
          endTime: booking!.endTime.toISOString(),
          status: booking!.status,
        }
      );

      // Act & Assert: Booking owner can view
      const ownerResult = await bookingAuditViewerService.getAuditLogsForBooking(
        testBookingUid,
        testUserId,
        testUserEmail,
        "en"
      );
      expect(ownerResult.auditLogs).toHaveLength(1);

      // Act & Assert: Attendee can view
      const attendeeResult = await bookingAuditViewerService.getAuditLogsForBooking(
        testBookingUid,
        testAttendeeUserId,
        testAttendeeEmail,
        "en"
      );
      expect(attendeeResult.auditLogs).toHaveLength(1);

      // Act & Assert: Unauthorized user cannot view
      const unauthorizedUserId = 999999;
      const unauthorizedEmail = "unauthorized@example.com";

      await expect(
        bookingAuditViewerService.getAuditLogsForBooking(
          testBookingUid,
          unauthorizedUserId,
          unauthorizedEmail,
          "en"
        )
      ).rejects.toThrow("You do not have permission to view audit logs for this booking");
    });
  });
});

