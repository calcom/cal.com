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

describe("Location Changed Action Integration", () => {
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

    // Setup basic test data using Test Data Builder pattern
    const owner = await createTestUser({ name: "Location Audit User" });
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

  describe("when location is changed", () => {
    it("should create audit record and retrieve it with correct location data", async () => {
      const actor = makeUserActor(testData.owner.uuid);
      const operationId = `op-${Date.now()}`;

      // Simulate LOCATION_CHANGED action
      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "LOCATION_CHANGED",
        source: "WEBAPP",
        operationId,
        data: {
          location: {
            old: "Zoom",
            new: "Google Meet",
          },
        },
        timestamp: Date.now(),
      });

      // Retrieve logs
      const result = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testData.booking.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      expect(result.bookingUid).toBe(testData.booking.uid);

      // Find the specific log we just created
      const auditLog = result.auditLogs.find((log) => log.operationId === operationId);
      expect(auditLog).toBeDefined();

      if (!auditLog) throw new Error("Audit log not found");

      expect(auditLog.action).toBe("LOCATION_CHANGED");
      // The type identifier from the service
      expect(auditLog.type).toBe("RECORD_UPDATED");

      expect(auditLog.displayJson).toBeNull();

      // Verify the title params are correct
      expect(auditLog.actionDisplayTitle).toBeDefined();
      expect(auditLog.actionDisplayTitle.key).toBe("booking_audit_action.location_changed_from_to");
      expect(auditLog.actionDisplayTitle.params).toEqual({
        fromLocation: "Zoom",
        toLocation: "Google Meet",
      });
    });

    it("should handle location change where old value was null", async () => {
      const actor = makeUserActor(testData.owner.uuid);
      const operationId = `op-initial-${Date.now()}`;

      // Simulate setting location for the first time (old is null)
      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "LOCATION_CHANGED",
        source: "WEBAPP",
        operationId,
        data: {
          location: {
            old: null,
            new: "In Person",
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

      const auditLog = result.auditLogs.find((log) => log.operationId === operationId);
      expect(auditLog).toBeDefined();

      expect(auditLog!.displayJson).toBeNull();

      expect(auditLog!.actionDisplayTitle.params).toEqual({
        fromLocation: "No location defined",
        toLocation: "In Person",
      });
    });
  });
});
