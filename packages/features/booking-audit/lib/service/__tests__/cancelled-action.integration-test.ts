import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import type { BookingAuditTaskConsumer } from "../BookingAuditTaskConsumer";
import type { BookingAuditViewerService } from "../BookingAuditViewerService";
import { makeUserActor } from "../../makeActor";
import { getBookingAuditTaskConsumer } from "../../../di/BookingAuditTaskConsumer.container";
import { getBookingAuditViewerService } from "../../../di/BookingAuditViewerService.container";
import {
  createTestUser,
  createTestOrganization,
  createTestMembership,
  createTestEventType,
  createTestBooking,
  enableFeatureForOrganization,
  cleanupTestData,
} from "./integration-utils";

describe("Cancelled Action Integration", () => {
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

  describe("when booking is cancelled", () => {
    it("should create audit record with cancellation details and retrieve it correctly", async () => {
      const actor = makeUserActor(testData.owner.uuid);
      const cancellationReason = "Schedule conflict";
      const cancelledBy = "owner";

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "CANCELLED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          cancellationReason,
          cancelledBy,
          status: {
            old: BookingStatus.ACCEPTED,
            new: BookingStatus.CANCELLED,
          },
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

      expect(result.auditLogs).toHaveLength(1);
      const auditLog = result.auditLogs[0];

      expect(auditLog.action).toBe("CANCELLED");
      expect(auditLog.type).toBe("RECORD_UPDATED");

      const displayData = auditLog.displayJson as Record<string, unknown>;
      expect(displayData.cancellationReason).toBe(cancellationReason);
      expect(displayData.cancelledBy).toBe(cancelledBy);
      expect(displayData.previousStatus).toBe(BookingStatus.ACCEPTED);
      expect(displayData.newStatus).toBe(BookingStatus.CANCELLED);
    });
  });
});
