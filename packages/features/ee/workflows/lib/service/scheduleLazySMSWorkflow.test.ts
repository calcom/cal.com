import dayjs from "@calcom/dayjs";
import { describe, expect, vi, beforeEach } from "vitest";

import { tasker } from "@calcom/features/tasker";
import { WorkflowTriggerEvents, TimeUnit } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { WorkflowService } from "./WorkflowService";

vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler");
vi.mock("@calcom/features/tasker");

const mockTasker = vi.mocked(tasker);

vi.mock("@calcom/features/profile/lib/hideBranding", () => ({
  getHideBranding: vi.fn().mockResolvedValue(false),
}));

const mockWorkflowReminderCreate = vi.fn();
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowReminderRepository", () => ({
  WorkflowReminderRepository: vi.fn().mockImplementation(function () {
    return {
      create: mockWorkflowReminderCreate,
    };
  }),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
  default: {},
}));

describe("WorkflowService.scheduleLazySMSWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should schedule lazy SMS workflow for BEFORE_EVENT trigger", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-sms-123",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = {
      id: 10,
      uuid: "sms-reminder-uuid-123",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-sms-123");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalledWith({
      bookingUid: "booking-sms-123",
      workflowStepId: 5,
      method: "SMS",
      scheduledDate: expect.any(Date),
      scheduled: true,
    });

    expect(mockTasker.create).toHaveBeenCalledWith(
      "sendWorkflowSMS",
      {
        bookingUid: "booking-sms-123",
        workflowReminderId: 10,
      },
      {
        scheduledAt: expect.any(Date),
        referenceUid: "sms-reminder-uuid-123",
      }
    );
  });

  test("should schedule lazy SMS workflow for AFTER_EVENT trigger", async () => {
    const mockWorkflow = {
      time: 1,
      timeUnit: TimeUnit.HOUR,
    };

    const futureStartTime = dayjs().add(1, "day").toISOString();
    const futureEndTime = dayjs().add(1, "day").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-sms-456",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = {
      id: 11,
      uuid: "sms-reminder-uuid-456",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-sms-456");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "AFTER_EVENT",
      workflowStepId: 6,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalledWith({
      bookingUid: "booking-sms-456",
      workflowStepId: 6,
      method: "SMS",
      scheduledDate: expect.any(Date),
      scheduled: true,
    });

    expect(mockTasker.create).toHaveBeenCalledWith(
      "sendWorkflowSMS",
      {
        bookingUid: "booking-sms-456",
        workflowReminderId: 11,
      },
      {
        scheduledAt: expect.any(Date),
        referenceUid: "sms-reminder-uuid-456",
      }
    );
  });

  test("should not schedule if bookingUid is missing", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const mockEvt = {
      uid: "",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).not.toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should not schedule if time is null", async () => {
    const mockWorkflow = {
      time: null,
      timeUnit: TimeUnit.HOUR,
    };

    const mockEvt = {
      uid: "booking-sms-789",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).not.toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should not schedule if timeUnit is null", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: null,
    };

    const mockEvt = {
      uid: "booking-sms-no-unit",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).not.toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should skip reminder if scheduled date is in the past for BEFORE_EVENT", async () => {
    const mockWorkflow = {
      time: 48,
      timeUnit: TimeUnit.HOUR,
    };

    // Event is only 24 hours away, but reminder is set for 48 hours before
    const tomorrowStartTime = dayjs().add(1, "day").toISOString();
    const tomorrowEndTime = dayjs().add(1, "day").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-sms-past",
      startTime: tomorrowStartTime,
      endTime: tomorrowEndTime,
    };

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).not.toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should NOT skip reminder for AFTER_EVENT even if calculated date is in the past", async () => {
    const mockWorkflow = {
      time: 1,
      timeUnit: TimeUnit.HOUR,
    };

    // Past end time, but AFTER_EVENT should still schedule
    const pastStartTime = dayjs().subtract(1, "hour").toISOString();
    const pastEndTime = dayjs().subtract(30, "minutes").toISOString();

    const mockEvt = {
      uid: "booking-sms-after",
      startTime: pastStartTime,
      endTime: pastEndTime,
    };

    const mockWorkflowReminder = {
      id: 12,
      uuid: "sms-reminder-uuid-after",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-sms-after");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "AFTER_EVENT",
      workflowStepId: 7,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    // AFTER_EVENT reminders should still be scheduled
    expect(mockWorkflowReminderCreate).toHaveBeenCalled();
    expect(mockTasker.create).toHaveBeenCalled();
  });

  test("should handle seated events with seatReferenceId", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-sms-seat",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = {
      id: 13,
      uuid: "sms-reminder-uuid-seat",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-sms-seat");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 8,
      workflow: mockWorkflow,
      evt: mockEvt,
      seatReferenceId: "seat-abc-123",
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingUid: "booking-sms-seat",
        seatReferenceUid: "seat-abc-123",
        method: "SMS",
        scheduled: true,
      })
    );

    expect(mockTasker.create).toHaveBeenCalled();
  });

  test("should not schedule tasker task if workflowReminder.id is null", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-sms-no-id",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    mockWorkflowReminderCreate.mockResolvedValue({
      id: null,
      uuid: "some-uuid",
    });

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should not schedule tasker task if workflowReminder.uuid is null", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-sms-no-uuid",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    mockWorkflowReminderCreate.mockResolvedValue({
      id: 14,
      uuid: null,
    });

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should handle repository create error gracefully", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-sms-error",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    mockWorkflowReminderCreate.mockRejectedValue(new Error("Database error"));

    // Should not throw
    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 5,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should use SMS method (not EMAIL) in workflowReminder", async () => {
    const mockWorkflow = {
      time: 30,
      timeUnit: TimeUnit.MINUTE,
    };

    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-method-check",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = { id: 15, uuid: "sms-uuid-method" };
    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-method");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 9,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ method: "SMS" })
    );
  });

  test("should calculate correct scheduled date for BEFORE_EVENT with MINUTE timeUnit", async () => {
    const mockWorkflow = {
      time: 30,
      timeUnit: TimeUnit.MINUTE,
    };

    const futureStartTime = dayjs().add(3, "days").toDate();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toDate();

    const mockEvt = {
      uid: "booking-minute-test",
      startTime: futureStartTime.toISOString(),
      endTime: futureEndTime.toISOString(),
    };

    const mockWorkflowReminder = { id: 16, uuid: "sms-uuid-minute" };
    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-minute");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 10,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    const createCall = mockWorkflowReminderCreate.mock.calls[0][0];
    const expectedDate = dayjs(futureStartTime).subtract(30, "minute").toDate();
    expect(createCall.scheduledDate.getTime()).toBeCloseTo(expectedDate.getTime(), -3);
  });

  test("should calculate correct scheduled date for AFTER_EVENT with DAY timeUnit", async () => {
    const mockWorkflow = {
      time: 1,
      timeUnit: TimeUnit.DAY,
    };

    const futureEndTime = dayjs().add(1, "day").add(1, "hour").toDate();

    const mockEvt = {
      uid: "booking-day-test",
      startTime: dayjs().add(1, "day").toISOString(),
      endTime: futureEndTime.toISOString(),
    };

    const mockWorkflowReminder = { id: 17, uuid: "sms-uuid-day" };
    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-day");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "AFTER_EVENT",
      workflowStepId: 11,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    const createCall = mockWorkflowReminderCreate.mock.calls[0][0];
    const expectedDate = dayjs(futureEndTime).add(1, "day").toDate();
    expect(createCall.scheduledDate.getTime()).toBeCloseTo(expectedDate.getTime(), -3);
  });

  test("should pass correct tasker task type 'sendWorkflowSMS'", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-task-type",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = { id: 18, uuid: "sms-uuid-task" };
    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue("task-type-check");

    await WorkflowService.scheduleLazySMSWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 12,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    // Verify the first argument is "sendWorkflowSMS" (not "sendWorkflowEmails")
    expect(mockTasker.create).toHaveBeenCalledWith(
      "sendWorkflowSMS",
      expect.any(Object),
      expect.any(Object)
    );
  });
});
