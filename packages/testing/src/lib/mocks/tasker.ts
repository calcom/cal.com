import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { expect, vi } from "vitest";

/**
 * Creates a mock Tasker for unit testing.
 *
 * Use this to test services that queue tasks without needing a real database.
 * The mock captures all create() calls so you can assert on them.
 *
 * @example
 * ```typescript
 * const mockTasker = createMockTasker();
 * const producer = new WebhookTaskerProducerService(mockTasker, mockLogger);
 *
 * await producer.queueBookingCreatedWebhook({ bookingUid: "123", ... });
 *
 * expectWebhookTaskQueued(mockTasker, {
 *   triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
 *   bookingUid: "123",
 * });
 * ```
 */
export function createMockTasker(): MockTasker {
  return {
    create: vi.fn().mockResolvedValue("mock-task-id"),
    cleanup: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue("mock-task-id"),
    cancelWithReference: vi.fn().mockResolvedValue("mock-task-id"),
  };
}

export type MockTasker = {
  create: ReturnType<typeof vi.fn>;
  cleanup: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  cancelWithReference: ReturnType<typeof vi.fn>;
};

/**
 * Asserts that a webhook task was queued with the expected payload.
 *
 * @example
 * ```typescript
 * expectWebhookTaskQueued(mockTasker, {
 *   triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
 *   bookingUid: "booking-123",
 *   eventTypeId: 10,
 *   userId: 5,
 * });
 * ```
 */
export function expectWebhookTaskQueued(
  mockTasker: MockTasker,
  expected: {
    triggerEvent: WebhookTriggerEvents;
    bookingUid?: string;
    eventTypeId?: number;
    userId?: number;
    teamId?: number | null;
    orgId?: number | null;
    oAuthClientId?: string;
    cancelledBy?: string;
    cancellationReason?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
  }
) {
  expect(mockTasker.create).toHaveBeenCalledWith("webhookDelivery", expect.objectContaining(expected));
}

/**
 * Asserts that a webhook task was NOT queued for a specific trigger event.
 */
export function expectWebhookTaskNotQueued(mockTasker: MockTasker, triggerEvent?: WebhookTriggerEvents) {
  if (triggerEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = mockTasker.create.mock.calls as any[];
    const webhookCalls = calls.filter(
      (call) =>
        call[0] === "webhookDelivery" &&
        (call[1] as { triggerEvent: WebhookTriggerEvents }).triggerEvent === triggerEvent
    );
    expect(webhookCalls).toHaveLength(0);
  } else {
    expect(mockTasker.create).not.toHaveBeenCalledWith("webhookDelivery", expect.anything());
  }
}

/**
 * Asserts the number of webhook tasks queued.
 */
export function expectWebhookTasksQueuedCount(mockTasker: MockTasker, count: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls = mockTasker.create.mock.calls as any[];
  const webhookCalls = calls.filter((call) => call[0] === "webhookDelivery");
  expect(webhookCalls).toHaveLength(count);
}

/**
 * Gets all webhook task payloads that were queued.
 * Useful for more complex assertions.
 */
export function getQueuedWebhookTasks(mockTasker: MockTasker) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls = mockTasker.create.mock.calls as any[];
  return calls.filter((call) => call[0] === "webhookDelivery").map((call) => call[1]);
}
