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

describe("Attendee Added Action Integration", () => {
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

  describe("when guests are added to a booking", () => {
    it("should create audit record with correct added attendees data", async () => {
      const actor = makeUserActor(testData.owner.uuid);
      const newGuestEmails = ["guest1@example.com", "guest2@example.com"];

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "ATTENDEE_ADDED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          added: newGuestEmails,
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
      expect(auditLog.action).toBe("ATTENDEE_ADDED");
      expect(auditLog.type).toBe("RECORD_UPDATED");

      const displayData = auditLog.displayJson as { addedAttendees: string[] };
      expect(displayData).toBeDefined();
      expect(displayData.addedAttendees).toEqual(newGuestEmails);

      expect(auditLog.actor.displayName).toBe("Test Audit User");
      expect(auditLog.actor.displayEmail).toBe(testData.owner.email);
      expect(auditLog.actor.userUuid).toBe(testData.owner.uuid);
    });
  });
});
