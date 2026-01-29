import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { WorkflowTaskService } from "../WorkflowTaskService";

vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler", () => ({
  scheduleWorkflowReminders: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType", () => ({
  getAllWorkflowsFromEventType: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: class MockCreditService {
    hasAvailableCredits = vi.fn().mockResolvedValue(true);
  },
}));

vi.mock("@calcom/features/CalendarEventBuilder", () => ({
  CalendarEventBuilder: {
    fromBooking: vi.fn().mockResolvedValue({
      build: vi.fn().mockReturnValue({
        bookerUrl: "https://cal.com/test",
        title: "Test Event",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        organizer: { email: "organizer@test.com", name: "Organizer" },
        attendees: [],
      }),
    }),
  },
}));

const { scheduleWorkflowReminders } = await import(
  "@calcom/features/ee/workflows/lib/reminders/reminderScheduler"
);
const { getAllWorkflowsFromEventType } = await import(
  "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType"
);

const mockScheduleWorkflowReminders = vi.mocked(scheduleWorkflowReminders);
const mockGetAllWorkflowsFromEventType = vi.mocked(getAllWorkflowsFromEventType);

describe("WorkflowTaskService", () => {
  let service: WorkflowTaskService;
  let mockBookingRepository: BookingRepository;
  let mockLogger: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const createMockBooking = (overrides = {}) => ({
    id: 123,
    uid: "booking-uid-123",
    title: "Test Booking",
    startTime: new Date(),
    endTime: new Date(),
    user: {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      timeZone: "UTC",
      locale: "en",
      timeFormat: 12,
    },
    eventType: {
      id: 1,
      slug: "test-event",
      title: "Test Event",
      schedulingType: null,
      teamId: null,
      userId: 1,
      parentId: null,
      metadata: {},
      hosts: [
        {
          userId: 1,
          isFixed: true,
          user: {
            id: 1,
            name: "Host",
            email: "host@example.com",
            username: "host",
            timeZone: "UTC",
            locale: "en",
            timeFormat: 12,
            destinationCalendar: {
              primaryEmail: "host@example.com",
            },
          },
        },
      ],
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    mockBookingRepository = {
      getBookingForWorkflowTasker: vi.fn().mockResolvedValue(createMockBooking()),
    } as unknown as BookingRepository;

    service = new WorkflowTaskService({
      logger: mockLogger,
      bookingRepository: mockBookingRepository,
    });
  });

  describe("constructor", () => {
    it("should be instantiable with dependencies", () => {
      expect(service).toBeInstanceOf(WorkflowTaskService);
      expect(service.dependencies.logger).toBe(mockLogger);
      expect(service.dependencies.bookingRepository).toBe(mockBookingRepository);
    });
  });

  describe("scheduleRescheduleWorkflows", () => {
    const basePayload = {
      bookingId: 123,
      smsReminderNumber: "+1234567890",
      hideBranding: false,
    };

    it("should fetch booking data and schedule workflows", async () => {
      const mockWorkflows = [
        {
          id: 1,
          name: "Reschedule Workflow",
          trigger: WorkflowTriggerEvents.RESCHEDULE_EVENT,
          time: null,
          timeUnit: null,
          steps: [],
        },
      ];

      mockGetAllWorkflowsFromEventType.mockResolvedValue(mockWorkflows);

      await service.scheduleRescheduleWorkflows(basePayload);

      expect(mockBookingRepository.getBookingForWorkflowTasker).toHaveBeenCalledWith(123);
      expect(mockGetAllWorkflowsFromEventType).toHaveBeenCalled();
      expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith(
        expect.objectContaining({
          workflows: mockWorkflows,
          smsReminderNumber: "+1234567890",
          hideBranding: false,
        })
      );
    });

    it("should filter workflows to only include RESCHEDULE_EVENT, BEFORE_EVENT, and AFTER_EVENT triggers", async () => {
      const mockWorkflows = [
        { id: 1, trigger: WorkflowTriggerEvents.RESCHEDULE_EVENT, steps: [] },
        { id: 2, trigger: WorkflowTriggerEvents.BEFORE_EVENT, steps: [] },
        { id: 3, trigger: WorkflowTriggerEvents.AFTER_EVENT, steps: [] },
        { id: 4, trigger: WorkflowTriggerEvents.NEW_EVENT, steps: [] },
        { id: 5, trigger: WorkflowTriggerEvents.EVENT_CANCELLED, steps: [] },
      ];

      mockGetAllWorkflowsFromEventType.mockResolvedValue(mockWorkflows);

      await service.scheduleRescheduleWorkflows(basePayload);

      expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith(
        expect.objectContaining({
          workflows: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 }),
            expect.objectContaining({ id: 3 }),
          ]),
        })
      );

      const calledWorkflows = mockScheduleWorkflowReminders.mock.calls[0][0].workflows;
      expect(calledWorkflows).toHaveLength(3);
      expect(calledWorkflows.map((w: { id: number }) => w.id)).toEqual([1, 2, 3]);
    });

    it("should skip scheduling if no matching workflows found", async () => {
      mockGetAllWorkflowsFromEventType.mockResolvedValue([
        { id: 1, trigger: WorkflowTriggerEvents.NEW_EVENT, steps: [] },
      ]);

      await service.scheduleRescheduleWorkflows(basePayload);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("No reschedule workflows found")
      );
      expect(mockScheduleWorkflowReminders).not.toHaveBeenCalled();
    });

    it("should throw error if booking not found", async () => {
      vi.mocked(mockBookingRepository.getBookingForWorkflowTasker).mockResolvedValue(null);

      await expect(service.scheduleRescheduleWorkflows(basePayload)).rejects.toThrow(
        "Booking with id '123' was not found."
      );
    });

    it("should throw error if booking has no eventType", async () => {
      vi.mocked(mockBookingRepository.getBookingForWorkflowTasker).mockResolvedValue(
        createMockBooking({ eventType: null })
      );

      await expect(service.scheduleRescheduleWorkflows(basePayload)).rejects.toThrow(
        "EventType of Booking with id '123' was not found."
      );
    });

    it("should throw error if booking has no user", async () => {
      vi.mocked(mockBookingRepository.getBookingForWorkflowTasker).mockResolvedValue(
        createMockBooking({ user: null })
      );

      await expect(service.scheduleRescheduleWorkflows(basePayload)).rejects.toThrow(
        "User of Booking with id '123' was not found."
      );
    });

    it("should include seatReferenceUid in workflow scheduling if provided", async () => {
      const mockWorkflows = [
        { id: 1, trigger: WorkflowTriggerEvents.RESCHEDULE_EVENT, steps: [] },
      ];
      mockGetAllWorkflowsFromEventType.mockResolvedValue(mockWorkflows);

      await service.scheduleRescheduleWorkflows({
        ...basePayload,
        seatReferenceUid: "seat-123",
      });

      expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith(
        expect.objectContaining({
          seatReferenceUid: "seat-123",
        })
      );
    });

    it("should handle workflows with empty steps array", async () => {
      const mockWorkflows = [
        { id: 1, trigger: WorkflowTriggerEvents.RESCHEDULE_EVENT, steps: [] },
      ];
      mockGetAllWorkflowsFromEventType.mockResolvedValue(mockWorkflows);

      await service.scheduleRescheduleWorkflows(basePayload);

      expect(mockScheduleWorkflowReminders).toHaveBeenCalled();
    });
  });
});
