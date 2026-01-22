import { describe, expect, it, beforeEach, afterEach } from "vitest";

import type { BookingStatus } from "@calcom/prisma/enums";
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

describe("No-Show Updated Action Integration", () => {
  let bookingAuditTaskConsumer: BookingAuditTaskConsumer;
  let bookingAuditViewerService: BookingAuditViewerService;

  let testData: {
    owner: { id: number; uuid: string; email: string };
    attendee: { id: number; email: string };
    organization: { id: number };
    eventType: { id: number };
    booking: { uid: string; startTime: Date; endTime: Date; status: BookingStatus };
    attendeeIds: number[];
  };

  beforeEach(async () => {
    bookingAuditTaskConsumer = getBookingAuditTaskConsumer();
    bookingAuditViewerService = getBookingAuditViewerService();

    const owner = await createTestUser({ name: "Test Host User" });
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

    // Get the attendee IDs from the booking
    const { prisma } = await import("@calcom/prisma");
    const bookingWithAttendees = await prisma.booking.findUnique({
      where: { uid: booking.uid },
      include: { attendees: true },
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
      attendeeIds: bookingWithAttendees?.attendees.map((a) => a.id) || [],
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

  describe("when host is marked as no-show", () => {
    it("should create audit record with host field containing userUuid and noShow", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          // New schema: host contains userUuid and noShow change
          host: {
            userUuid: testData.owner.uuid,
            noShow: { old: null, new: true },
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

      expect(result.bookingUid).toBe(testData.booking.uid);
      expect(result.auditLogs).toHaveLength(1);

      const auditLog = result.auditLogs[0];
      expect(auditLog.bookingUid).toBe(testData.booking.uid);
      expect(auditLog.action).toBe("NO_SHOW_UPDATED");
      expect(auditLog.type).toBe("RECORD_UPDATED");

      const displayData = auditLog.displayJson as Record<string, unknown>;
      expect(displayData).toBeDefined();
      expect(displayData.hostNoShow).toBe(true);
      expect(displayData.previousHostNoShow).toBe(null);
    });
  });

  describe("when attendees are marked as no-show", () => {
    /**
     * This test validates that attendeesNoShow uses email keys (not attendee IDs).
     *
     * Attendee record IDs can be reused with different person's data, so using
     * email correctly identifies the person regardless of record reuse.
     */
    it("should create audit record with attendeesNoShow using email keys", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      // Build attendeesNoShow with email key (not attendee ID)
      const attendeesNoShow: Record<string, { old: boolean | null; new: boolean }> = {
        [testData.attendee.email]: { old: null, new: true },
      };

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          attendeesNoShow,
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
      expect(auditLog.action).toBe("NO_SHOW_UPDATED");
      expect(auditLog.type).toBe("RECORD_UPDATED");

      const displayData = auditLog.displayJson as Record<string, unknown>;
      expect(displayData).toBeDefined();
      expect(displayData.attendeesNoShow).toBeDefined();

      // Verify the attendee data is correctly stored and retrieved using email key
      const storedAttendeesNoShow = displayData.attendeesNoShow as Record<
        string,
        { old: boolean | null; new: boolean }
      >;
      expect(storedAttendeesNoShow[testData.attendee.email]).toBeDefined();
      expect(storedAttendeesNoShow[testData.attendee.email].old).toBe(null);
      expect(storedAttendeesNoShow[testData.attendee.email].new).toBe(true);
    });

    it("should handle multiple attendees marked as no-show with email keys", async () => {
      // Create a second attendee for this test
      const { prisma } = await import("@calcom/prisma");
      const secondAttendeeEmail = `second-attendee-${Date.now()}@example.com`;
      const secondAttendee = await prisma.attendee.create({
        data: {
          email: secondAttendeeEmail,
          name: "Second Attendee",
          timeZone: "UTC",
          bookingId: (await prisma.booking.findUnique({ where: { uid: testData.booking.uid } }))!.id,
        },
      });

      const actor = makeUserActor(testData.owner.uuid);

      // Build attendeesNoShow with multiple email keys
      const attendeesNoShow: Record<string, { old: boolean | null; new: boolean }> = {
        [testData.attendee.email]: { old: null, new: true },
        [secondAttendeeEmail]: { old: false, new: true },
      };

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          attendeesNoShow,
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

      const displayData = result.auditLogs[0].displayJson as Record<string, unknown>;
      const storedAttendeesNoShow = displayData.attendeesNoShow as Record<
        string,
        { old: boolean | null; new: boolean }
      >;

      // Verify both attendees are stored correctly using email keys
      expect(Object.keys(storedAttendeesNoShow)).toHaveLength(2);
      expect(storedAttendeesNoShow[testData.attendee.email]).toEqual({ old: null, new: true });
      expect(storedAttendeesNoShow[secondAttendeeEmail]).toEqual({ old: false, new: true });

      // Cleanup the second attendee
      await prisma.attendee.delete({ where: { id: secondAttendee.id } });
    });
  });

  describe("when both host and attendees are marked as no-show", () => {
    it("should create single audit record with both host and attendeesNoShow fields", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "API_V2",
        operationId: `op-${Date.now()}`,
        data: {
          // New schema: host contains userUuid and noShow change
          host: {
            userUuid: testData.owner.uuid,
            noShow: { old: null, new: true },
          },
          // New schema: attendeesNoShow uses email keys
          attendeesNoShow: {
            [testData.attendee.email]: { old: null, new: true },
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
      expect(auditLog.action).toBe("NO_SHOW_UPDATED");
      expect(auditLog.source).toBe("API_V2");

      const displayData = auditLog.displayJson as Record<string, unknown>;

      // Verify host no-show
      expect(displayData.hostNoShow).toBe(true);
      expect(displayData.previousHostNoShow).toBe(null);

      // Verify attendee no-show with email key
      const storedAttendeesNoShow = displayData.attendeesNoShow as Record<
        string,
        { old: boolean | null; new: boolean }
      >;
      expect(storedAttendeesNoShow[testData.attendee.email]).toEqual({ old: null, new: true });
    });
  });

  describe("schema validation with email keys", () => {
    /**
     * This test validates that attendeesNoShow correctly uses email keys.
     *
     * Email keys are used because attendee record IDs can be reused with
     * different person's data, while email correctly identifies the person.
     */
    it("should accept attendeesNoShow data with email keys", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      // Create data with email keys
      const dataWithEmailKeys = {
        attendeesNoShow: {
          [testData.attendee.email]: { old: null, new: true },
        },
      };

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: dataWithEmailKeys,
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

      const displayData = result.auditLogs[0].displayJson as Record<string, unknown>;
      expect(displayData.attendeesNoShow).toBeDefined();

      // The key should be the email address
      const storedAttendeesNoShow = displayData.attendeesNoShow as Record<
        string,
        { old: boolean | null; new: boolean }
      >;
      expect(storedAttendeesNoShow[testData.attendee.email]).toBeDefined();
    });
  });
});
