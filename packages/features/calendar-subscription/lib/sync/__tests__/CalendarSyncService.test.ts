import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import { BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/features/webhooks/lib/scheduleTrigger", () => ({
  deleteWebhookScheduledTriggers: vi.fn().mockResolvedValue(undefined),
  cancelNoShowTasksForBooking: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/ee/workflows/repositories/WorkflowRepository", () => ({
  WorkflowRepository: {
    deleteAllWorkflowReminders: vi.fn().mockResolvedValue(undefined),
  },
}));

import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import {
  cancelNoShowTasksForBooking,
  deleteWebhookScheduledTriggers,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import { CalendarSyncService } from "../CalendarSyncService";

function createMockBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uid: "test-booking-uid",
    title: "Test Booking",
    status: BookingStatus.ACCEPTED,
    startTime: new Date("2026-03-01T10:00:00Z"),
    endTime: new Date("2026-03-01T10:30:00Z"),
    iCalSequence: 0,
    eventType: {
      id: 1,
      disableCancelling: false,
      disableRescheduling: false,
    },
    workflowReminders: [],
    ...overrides,
  };
}

function createMockEvent(
  overrides: Partial<CalendarSubscriptionEventItem> = {}
): CalendarSubscriptionEventItem {
  return {
    id: "event-1",
    iCalUID: "test-booking-uid@cal.com",
    start: new Date("2026-03-01T14:00:00Z"),
    end: new Date("2026-03-01T14:30:00Z"),
    busy: true,
    isAllDay: false,
    summary: "Updated Event Title",
    description: null,
    kind: "calendar#event",
    etag: "test-etag",
    status: "confirmed",
    location: null,
    originalStartDate: null,
    recurringEventId: null,
    timeZone: "UTC",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("CalendarSyncService", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: {
    findByUidIncludeEventTypeAndWorkflowReminders: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepository = {
      findByUidIncludeEventTypeAndWorkflowReminders: vi.fn().mockResolvedValue(createMockBooking()),
      update: vi.fn().mockResolvedValue({}),
    };

    service = new CalendarSyncService({
      bookingRepository: mockBookingRepository as never,
    });
  });

  describe("cancelBooking", () => {
    test("should cancel an accepted booking", async () => {
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
      });
      expect(mockBookingRepository.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: "Cancelled via Google Calendar",
          iCalSequence: 1,
        },
      });
      expect(deleteWebhookScheduledTriggers).toHaveBeenCalledWith({
        booking: { id: 1, uid: "test-booking-uid" },
      });
      expect(cancelNoShowTasksForBooking).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
      });
    });

    test("should skip if iCalUID is null", async () => {
      const event = createMockEvent({ iCalUID: null });

      await service.cancelBooking(event);

      expect(mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders).not.toHaveBeenCalled();
      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is not found", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(null);
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is already cancelled", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ status: BookingStatus.CANCELLED })
      );
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is PENDING", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ status: BookingStatus.PENDING })
      );
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is AWAITING_HOST", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ status: BookingStatus.AWAITING_HOST })
      );
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if event type has disableCancelling enabled", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({
          eventType: { id: 1, disableCancelling: true, disableRescheduling: false },
        })
      );
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should increment iCalSequence on cancellation", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ iCalSequence: 5 })
      );
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ iCalSequence: 6 }),
        })
      );
    });

    test("should clean up workflow reminders when present", async () => {
      const workflowReminders = [
        { id: 1, referenceId: "ref-1", method: WorkflowMethods.EMAIL },
        { id: 2, referenceId: "ref-2", method: WorkflowMethods.SMS },
      ];
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ workflowReminders })
      );
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(WorkflowRepository.deleteAllWorkflowReminders).toHaveBeenCalledWith(workflowReminders);
    });

    test("should not call deleteAllWorkflowReminders when no workflow reminders exist", async () => {
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(WorkflowRepository.deleteAllWorkflowReminders).not.toHaveBeenCalled();
    });

    test("should still cancel booking even if cleanup fails", async () => {
      vi.mocked(deleteWebhookScheduledTriggers).mockRejectedValueOnce(new Error("cleanup failed"));
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BookingStatus.CANCELLED }),
        })
      );
    });

    test("should proceed with cancellation when eventType is null", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ eventType: null })
      );
      const event = createMockEvent({ status: "cancelled" });

      await service.cancelBooking(event);

      expect(mockBookingRepository.update).toHaveBeenCalled();
    });
  });

  describe("rescheduleBooking", () => {
    test("should reschedule an accepted booking", async () => {
      const event = createMockEvent({
        summary: "New Title",
        start: new Date("2026-03-02T10:00:00Z"),
        end: new Date("2026-03-02T10:30:00Z"),
      });

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: "New Title",
          startTime: new Date("2026-03-02T10:00:00Z"),
          endTime: new Date("2026-03-02T10:30:00Z"),
          iCalSequence: 1,
        },
      });
    });

    test("should preserve existing title when event summary is null", async () => {
      const event = createMockEvent({ summary: null });

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "Test Booking" }),
        })
      );
    });

    test("should skip if iCalUID is null", async () => {
      const event = createMockEvent({ iCalUID: null });

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders).not.toHaveBeenCalled();
      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is not found", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(null);
      const event = createMockEvent();

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is cancelled", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ status: BookingStatus.CANCELLED })
      );
      const event = createMockEvent();

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is PENDING", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ status: BookingStatus.PENDING })
      );
      const event = createMockEvent();

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if booking is AWAITING_HOST", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ status: BookingStatus.AWAITING_HOST })
      );
      const event = createMockEvent();

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should skip if event type has disableRescheduling enabled", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({
          eventType: { id: 1, disableCancelling: false, disableRescheduling: true },
        })
      );
      const event = createMockEvent();

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    test("should increment iCalSequence on reschedule", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ iCalSequence: 3 })
      );
      const event = createMockEvent();

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ iCalSequence: 4 }),
        })
      );
    });

    test("should proceed with reschedule when eventType is null", async () => {
      mockBookingRepository.findByUidIncludeEventTypeAndWorkflowReminders.mockResolvedValue(
        createMockBooking({ eventType: null })
      );
      const event = createMockEvent();

      await service.rescheduleBooking(event);

      expect(mockBookingRepository.update).toHaveBeenCalled();
    });
  });

  describe("handleEvents", () => {
    const mockSelectedCalendar = {
      externalId: "test@example.com",
    } as never;

    test("should route cancelled events to cancelBooking", async () => {
      const cancelSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      const events = [createMockEvent({ status: "cancelled" })];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(rescheduleSpy).not.toHaveBeenCalled();
    });

    test("should route non-cancelled events to rescheduleBooking", async () => {
      const cancelSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      const events = [createMockEvent({ status: "confirmed" })];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(rescheduleSpy).toHaveBeenCalledTimes(1);
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    test("should skip non-cal.com events", async () => {
      const cancelSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      const events = [createMockEvent({ iCalUID: "external-event@gmail.com" })];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(cancelSpy).not.toHaveBeenCalled();
      expect(rescheduleSpy).not.toHaveBeenCalled();
    });

    test("should handle mixed cancelled and non-cancelled events", async () => {
      const cancelSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      const events = [
        createMockEvent({ iCalUID: "uid1@cal.com", status: "cancelled" }),
        createMockEvent({ iCalUID: "uid2@cal.com", status: "confirmed" }),
      ];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(rescheduleSpy).toHaveBeenCalledTimes(1);
    });

    test("should return early when no events provided", async () => {
      const cancelSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      await service.handleEvents(mockSelectedCalendar, []);

      expect(cancelSpy).not.toHaveBeenCalled();
      expect(rescheduleSpy).not.toHaveBeenCalled();
    });
  });
});
