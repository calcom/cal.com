import prisma from "@calcom/prisma";
import type { BookingStatus } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBookingAuditTaskConsumer } from "../../../di/BookingAuditTaskConsumer.container";
import { getBookingAuditViewerService } from "../../../di/BookingAuditViewerService.container";
import { makeUserActor } from "../../makeActor";
import type { BookingAuditTaskConsumer } from "../BookingAuditTaskConsumer";
import type { BookingAuditViewerService } from "../BookingAuditViewerService";
import {
  cleanupTestData,
  createTestBooking,
  createTestEventType,
  createTestMembership,
  createTestOrganization,
  createTestUser,
  enableFeatureForOrganization,
} from "./integration-utils";

describe("Created Action Integration", () => {
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
          hostUserUuid: testData.owner.uuid,
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
          hostUserUuid: testData.owner.uuid,
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

    it("should include impersonator details when context has impersonatedBy", async () => {
      // Create a second user to act as impersonator
      const impersonator = await createTestUser({ name: "Admin Impersonator" });

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
          hostUserUuid: testData.owner.uuid,
        },
        timestamp: Date.now(),
        context: {
          impersonatedBy: impersonator.uuid,
        },
      });

      const result = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testData.booking.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      expect(result.auditLogs).toHaveLength(1);

      const auditLog = result.auditLogs[0];
      expect(auditLog.impersonatedBy).toBeDefined();
      expect(auditLog.impersonatedBy?.displayName).toBe("Admin Impersonator");
      expect(auditLog.impersonatedBy?.displayEmail).toBe(impersonator.email);

      // Cleanup impersonator user
      await prisma.user.delete({ where: { id: impersonator.id } });
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
          hostUserUuid: testData.owner.uuid,
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
          isBulk: true,
          bookings: [
            {
              bookingUid: testData.booking.uid,
              data: {
                startTime: testData.booking.startTime.getTime(),
                endTime: testData.booking.endTime.getTime(),
                status: testData.booking.status,
                hostUserUuid: testData.owner.uuid,
              },
            },
            {
              bookingUid: booking2.uid,
              data: {
                startTime: booking2.startTime.getTime(),
                endTime: booking2.endTime.getTime(),
                status: booking2.status,
                hostUserUuid: testData.owner.uuid,
              },
            },
            {
              bookingUid: booking3.uid,
              data: {
                startTime: booking3.startTime.getTime(),
                endTime: booking3.endTime.getTime(),
                status: booking3.status,
                hostUserUuid: testData.owner.uuid,
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
