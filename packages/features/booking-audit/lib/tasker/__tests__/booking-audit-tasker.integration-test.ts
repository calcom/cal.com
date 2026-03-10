import type { BookingStatus } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBookingAuditTasker } from "../../../di/BookingAuditTasker.container";
import { getBookingAuditViewerService } from "../../../di/BookingAuditViewerService.container";
import { makeUserActor } from "../../makeActor";
import {
  cleanupTestData,
  createTestBooking,
  createTestEventType,
  createTestMembership,
  createTestOrganization,
  createTestUser,
  enableFeatureForOrganization,
} from "../../service/__tests__/integration-utils";
import type { BookingAuditViewerService } from "../../service/BookingAuditViewerService";
import type { BookingAuditTasker } from "../BookingAuditTasker";

describe("BookingAuditTasker Integration", () => {
  let bookingAuditTasker: BookingAuditTasker;
  let bookingAuditViewerService: BookingAuditViewerService;

  let testData: {
    owner: { id: number; uuid: string; email: string };
    attendee: { id: number; email: string };
    organization: { id: number };
    eventType: { id: number };
    booking: { uid: string; startTime: Date; endTime: Date; status: BookingStatus };
  };

  beforeEach(async () => {
    bookingAuditTasker = getBookingAuditTasker();
    bookingAuditViewerService = getBookingAuditViewerService();

    const owner = await createTestUser({ name: "Test Tasker User" });
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

  describe("Sync mode (default in tests)", () => {
    it("should process single audit task and create DB record", async () => {
      const actor = makeUserActor(testData.owner.uuid);

      const result = await bookingAuditTasker.processAuditTask({
        payload: {
          isBulk: false,
          bookingUid: testData.booking.uid,
          actor,
          action: "CREATED",
          source: "WEBAPP",
          operationId: `op-${Date.now()}`,
          timestamp: Date.now(),
          organizationId: testData.organization.id,
          data: {
            startTime: testData.booking.startTime.getTime(),
            endTime: testData.booking.endTime.getTime(),
            status: testData.booking.status,
            hostUserUuid: testData.owner.uuid,
          },
        },
      });

      expect(result.runId).toMatch(/^sync_/);

      const auditLogs = await bookingAuditViewerService.getAuditLogsForBooking({
        bookingUid: testData.booking.uid,
        userId: testData.owner.id,
        userEmail: testData.owner.email,
        userTimeZone: "UTC",
        organizationId: testData.organization.id,
      });

      expect(auditLogs.auditLogs).toHaveLength(1);
      expect(auditLogs.auditLogs[0].action).toBe("CREATED");
      expect(auditLogs.auditLogs[0].type).toBe("RECORD_CREATED");
    });

    it("should process bulk audit task and create DB records", async () => {
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

      const result = await bookingAuditTasker.processBulkAuditTask({
        payload: {
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
          timestamp: Date.now(),
          organizationId: testData.organization.id,
        },
      });

      expect(result.runId).toMatch(/^sync_/);

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

      expect(result1.auditLogs[0].operationId).toBe(operationId);
      expect(result2.auditLogs[0].operationId).toBe(operationId);
      expect(result3.auditLogs[0].operationId).toBe(operationId);

      await cleanupTestData({ bookingUid: booking2.uid });
      await cleanupTestData({ bookingUid: booking3.uid });
    });
  });

  describe("Async mode (mocked Trigger.dev)", () => {
    it("should delegate single audit task to Trigger.dev", async () => {
      const mockTriggerHandle = { id: "run_trigger_123" };
      const mockTrigger = vi.fn().mockResolvedValue(mockTriggerHandle);

      vi.doMock("../trigger/process-audit-task", () => ({
        processAuditTask: {
          trigger: mockTrigger,
        },
      }));

      const { BookingAuditTriggerTasker } = await import("../BookingAuditTriggerTasker");
      const triggerTasker = new BookingAuditTriggerTasker({});

      const payload = {
        isBulk: false as const,
        bookingUid: testData.booking.uid,
        actor: makeUserActor(testData.owner.uuid),
        action: "CREATED" as const,
        source: "WEBAPP" as const,
        operationId: `op-${Date.now()}`,
        timestamp: Date.now(),
        organizationId: testData.organization.id,
        data: {
          startTime: testData.booking.startTime.getTime(),
          endTime: testData.booking.endTime.getTime(),
          status: testData.booking.status,
          hostUserUuid: testData.owner.uuid,
        },
      };

      const result = await triggerTasker.processAuditTask(payload);

      expect(result.runId).toBe("run_trigger_123");
      expect(mockTrigger).toHaveBeenCalledWith(payload, expect.objectContaining({ tags: expect.any(Array) }));

      vi.doUnmock("../trigger/process-audit-task");
    });

    it("should delegate bulk audit task to Trigger.dev", async () => {
      const mockTriggerHandle = { id: "run_trigger_bulk_456" };
      const mockTrigger = vi.fn().mockResolvedValue(mockTriggerHandle);

      vi.doMock("../trigger/process-bulk-audit-task", () => ({
        processBulkAuditTask: {
          trigger: mockTrigger,
        },
      }));

      const { BookingAuditTriggerTasker } = await import("../BookingAuditTriggerTasker");
      const triggerTasker = new BookingAuditTriggerTasker({});

      const payload = {
        isBulk: true as const,
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
        ],
        actor: makeUserActor(testData.owner.uuid),
        action: "CREATED" as const,
        source: "WEBAPP" as const,
        operationId: `bulk-op-${Date.now()}`,
        timestamp: Date.now(),
        organizationId: testData.organization.id,
      };

      const result = await triggerTasker.processBulkAuditTask(payload);

      expect(result.runId).toBe("run_trigger_bulk_456");
      expect(mockTrigger).toHaveBeenCalledWith(payload, expect.objectContaining({ tags: expect.any(Array) }));

      vi.doUnmock("../trigger/process-bulk-audit-task");
    });
  });
});
