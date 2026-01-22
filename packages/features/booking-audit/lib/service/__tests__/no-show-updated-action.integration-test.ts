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
    it("should create audit record with hostNoShow field", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: {
          hostNoShow: { old: null, new: true },
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
     * This test validates the z.coerce.number() fix for attendeesNoShow keys.
     *
     * JavaScript object keys are always strings at runtime. When we create
     * attendeesNoShow data like { [attendeeId]: { old: null, new: true } },
     * the key becomes a string (e.g., "123" instead of 123).
     *
     * Without z.coerce.number() in the schema, Zod validation would fail
     * because z.record(z.number(), ...) expects numeric keys, but receives strings.
     *
     * This test would fail if we used z.record(z.number(), BooleanChangeSchema)
     * instead of z.record(z.coerce.number(), BooleanChangeSchema).
     */
    it("should create audit record with attendeesNoShow using numeric string keys (validates coerce fix)", async () => {
      const actor = makeUserActor(testData.owner.uuid);
      const attendeeId = testData.attendeeIds[0];

      // Build attendeesNoShow with numeric key - JavaScript will convert to string at runtime
      const attendeesNoShow: Record<number, { old: boolean | null; new: boolean }> = {
        [attendeeId]: { old: null, new: true },
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

      // Verify the attendee data is correctly stored and retrieved
      const storedAttendeesNoShow = displayData.attendeesNoShow as Record<
        number,
        { old: boolean | null; new: boolean }
      >;
      expect(storedAttendeesNoShow[attendeeId]).toBeDefined();
      expect(storedAttendeesNoShow[attendeeId].old).toBe(null);
      expect(storedAttendeesNoShow[attendeeId].new).toBe(true);
    });

    it("should handle multiple attendees marked as no-show with string keys coerced to numbers", async () => {
      // Create a second attendee for this test
      const { prisma } = await import("@calcom/prisma");
      const secondAttendee = await prisma.attendee.create({
        data: {
          email: `second-attendee-${Date.now()}@example.com`,
          name: "Second Attendee",
          timeZone: "UTC",
          bookingId: (await prisma.booking.findUnique({ where: { uid: testData.booking.uid } }))!.id,
        },
      });

      const actor = makeUserActor(testData.owner.uuid);
      const firstAttendeeId = testData.attendeeIds[0];
      const secondAttendeeId = secondAttendee.id;

      // Build attendeesNoShow with multiple numeric keys
      const attendeesNoShow: Record<number, { old: boolean | null; new: boolean }> = {
        [firstAttendeeId]: { old: null, new: true },
        [secondAttendeeId]: { old: false, new: true },
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
        number,
        { old: boolean | null; new: boolean }
      >;

      // Verify both attendees are stored correctly
      expect(Object.keys(storedAttendeesNoShow)).toHaveLength(2);
      expect(storedAttendeesNoShow[firstAttendeeId]).toEqual({ old: null, new: true });
      expect(storedAttendeesNoShow[secondAttendeeId]).toEqual({ old: false, new: true });

      // Cleanup the second attendee
      await prisma.attendee.delete({ where: { id: secondAttendee.id } });
    });
  });

  describe("when both host and attendees are marked as no-show", () => {
    it("should create single audit record with both hostNoShow and attendeesNoShow fields", async () => {
      const actor = makeUserActor(testData.owner.uuid);
      const attendeeId = testData.attendeeIds[0];

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "API_V2",
        operationId: `op-${Date.now()}`,
        data: {
          hostNoShow: { old: null, new: true },
          attendeesNoShow: {
            [attendeeId]: { old: null, new: true },
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

      // Verify attendee no-show with coerced numeric key
      const storedAttendeesNoShow = displayData.attendeesNoShow as Record<
        number,
        { old: boolean | null; new: boolean }
      >;
      expect(storedAttendeesNoShow[attendeeId]).toEqual({ old: null, new: true });
    });
  });

  describe("schema validation", () => {
    /**
     * This test verifies that the Zod refine validation rejects empty data.
     * The schema requires at least one of hostNoShow or attendeesNoShow to be provided.
     */
    it("should reject data with neither hostNoShow nor attendeesNoShow (validates refine)", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      // Attempt to create audit with empty data - should fail validation
      await expect(
        bookingAuditTaskConsumer.onBookingAction({
          bookingUid: testData.booking.uid,
          actor,
          action: "NO_SHOW_UPDATED",
          source: "WEBAPP",
          operationId: `op-${Date.now()}`,
          data: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow();
    });

    /**
     * This test explicitly demonstrates that string keys work correctly
     * due to z.coerce.number() in the schema.
     *
     * We pass data where keys are explicitly strings (as they would be
     * when coming from JSON parsing or JavaScript object serialization).
     */
    it("should accept attendeesNoShow data with explicit string keys", async () => {
      const actor = makeUserActor(testData.owner.uuid);
      const attendeeId = testData.attendeeIds[0];

      // Explicitly create data with string keys (simulating JSON.parse behavior)
      const dataWithStringKeys = {
        attendeesNoShow: {
          [String(attendeeId)]: { old: null, new: true },
        },
      };

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: dataWithStringKeys,
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

      // The key should be accessible as a number after coercion
      const storedAttendeesNoShow = displayData.attendeesNoShow as Record<
        number,
        { old: boolean | null; new: boolean }
      >;
      expect(storedAttendeesNoShow[attendeeId]).toBeDefined();
    });
  });
});
