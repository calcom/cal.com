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

describe("No-Show Updated Action Integration", () => {
  let bookingAuditTaskConsumer: BookingAuditTaskConsumer;
  let bookingAuditViewerService: BookingAuditViewerService;

  let testData: {
    owner: { id: number; uuid: string; email: string };
    attendee: { id: number; email: string };
    organization: { id: number };
    eventType: { id: number };
    booking: { id: number; uid: string; startTime: Date; endTime: Date; status: BookingStatus };
  };

  const additionalAttendeeEmails: string[] = [];

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

    testData = {
      owner: { id: owner.id, uuid: owner.uuid, email: owner.email },
      attendee: { id: attendee.id, email: attendee.email },
      organization: { id: organization.id },
      eventType: { id: eventType.id },
      booking: {
        id: booking.id,
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
      attendeeEmails: [
        ...(testData.attendee?.email ? [testData.attendee.email] : []),
        ...additionalAttendeeEmails,
      ],
      eventTypeId: testData.eventType?.id,
      organizationId: testData.organization?.id,
      userIds: [testData.owner?.id, testData.attendee?.id].filter((id): id is number => id !== undefined),
      featureSlug: "booking-audit",
    });
    additionalAttendeeEmails.length = 0;
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
    it("should create audit record with attendeesNoShow array", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      const attendeesNoShow = [{ attendeeEmail: testData.attendee.email, noShow: { old: null, new: true } }];

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

      const storedAttendeesNoShow = displayData.attendeesNoShow as Array<{
        attendeeEmail: string;
        noShow: { old: boolean | null; new: boolean };
      }>;
      expect(storedAttendeesNoShow).toHaveLength(1);
      expect(storedAttendeesNoShow[0].attendeeEmail).toBe(testData.attendee.email);
      expect(storedAttendeesNoShow[0].noShow.old).toBe(null);
      expect(storedAttendeesNoShow[0].noShow.new).toBe(true);
    });

    it("should handle multiple attendees marked as no-show", async () => {
      const { prisma } = await import("@calcom/prisma");
      const secondAttendeeEmail = `second-attendee-${Date.now()}@example.com`;
      additionalAttendeeEmails.push(secondAttendeeEmail);
      await prisma.attendee.create({
        data: {
          email: secondAttendeeEmail,
          name: "Second Attendee",
          timeZone: "UTC",
          bookingId: testData.booking.id,
        },
      });

      const actor = makeUserActor(testData.owner.uuid);

      const attendeesNoShow = [
        { attendeeEmail: testData.attendee.email, noShow: { old: null, new: true } },
        { attendeeEmail: secondAttendeeEmail, noShow: { old: false, new: true } },
      ];

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
      const storedAttendeesNoShow = displayData.attendeesNoShow as Array<{
        attendeeEmail: string;
        noShow: { old: boolean | null; new: boolean };
      }>;

      expect(storedAttendeesNoShow).toHaveLength(2);
      const firstAttendee = storedAttendeesNoShow.find((a) => a.attendeeEmail === testData.attendee.email);
      const secondAttendeeData = storedAttendeesNoShow.find((a) => a.attendeeEmail === secondAttendeeEmail);
      expect(firstAttendee?.noShow).toEqual({ old: null, new: true });
      expect(secondAttendeeData?.noShow).toEqual({ old: false, new: true });
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
          host: {
            userUuid: testData.owner.uuid,
            noShow: { old: null, new: true },
          },
          attendeesNoShow: [{ attendeeEmail: testData.attendee.email, noShow: { old: null, new: true } }],
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

      expect(displayData.hostNoShow).toBe(true);
      expect(displayData.previousHostNoShow).toBe(null);

      const storedAttendeesNoShow = displayData.attendeesNoShow as Array<{
        attendeeEmail: string;
        noShow: { old: boolean | null; new: boolean };
      }>;
      expect(storedAttendeesNoShow).toHaveLength(1);
      expect(storedAttendeesNoShow[0].attendeeEmail).toBe(testData.attendee.email);
      expect(storedAttendeesNoShow[0].noShow).toEqual({ old: null, new: true });
    });
  });

  describe("schema validation with array format", () => {
    it("should accept attendeesNoShow data with array format", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      const dataWithArrayFormat = {
        attendeesNoShow: [{ attendeeEmail: testData.attendee.email, noShow: { old: null, new: true } }],
      };

      await bookingAuditTaskConsumer.onBookingAction({
        bookingUid: testData.booking.uid,
        actor,
        action: "NO_SHOW_UPDATED",
        source: "WEBAPP",
        operationId: `op-${Date.now()}`,
        data: dataWithArrayFormat,
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

      const storedAttendeesNoShow = displayData.attendeesNoShow as Array<{
        attendeeEmail: string;
        noShow: { old: boolean | null; new: boolean };
      }>;
      expect(storedAttendeesNoShow).toHaveLength(1);
      expect(storedAttendeesNoShow[0].attendeeEmail).toBe(testData.attendee.email);
    });
  });
});
