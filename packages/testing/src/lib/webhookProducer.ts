import { expect, vi } from "vitest";

export type MockWebhookProducer = {
  queueBookingCancelledWebhook: ReturnType<typeof vi.fn>;
  queueBookingRejectedWebhook: ReturnType<typeof vi.fn>;
  queueBookingPaymentInitiatedWebhook: ReturnType<typeof vi.fn>;
  queueBookingPaidWebhook: ReturnType<typeof vi.fn>;
  queueBookingNoShowUpdatedWebhook: ReturnType<typeof vi.fn>;
  queueBookingWebhook: ReturnType<typeof vi.fn>;
  queueFormSubmittedWebhook: ReturnType<typeof vi.fn>;
  queueRecordingReadyWebhook: ReturnType<typeof vi.fn>;
  queueOOOCreatedWebhook: ReturnType<typeof vi.fn>;
};

export function createMockWebhookProducer(): MockWebhookProducer {
  return {
    queueBookingCancelledWebhook: vi.fn().mockResolvedValue(undefined),
    queueBookingRejectedWebhook: vi.fn().mockResolvedValue(undefined),
    queueBookingPaymentInitiatedWebhook: vi.fn().mockResolvedValue(undefined),
    queueBookingPaidWebhook: vi.fn().mockResolvedValue(undefined),
    queueBookingNoShowUpdatedWebhook: vi.fn().mockResolvedValue(undefined),
    queueBookingWebhook: vi.fn().mockResolvedValue(undefined),
    queueFormSubmittedWebhook: vi.fn().mockResolvedValue(undefined),
    queueRecordingReadyWebhook: vi.fn().mockResolvedValue(undefined),
    queueOOOCreatedWebhook: vi.fn().mockResolvedValue(undefined),
  };
}

export function expectWebhookProducerCalled(
  mock: MockWebhookProducer,
  method: keyof MockWebhookProducer,
  expected: Record<string, unknown>,
  triggerEvent?: string
) {
  if (triggerEvent) {
    expect(mock[method]).toHaveBeenCalledWith(triggerEvent, expect.objectContaining(expected));
  } else {
    expect(mock[method]).toHaveBeenCalledWith(expect.objectContaining(expected));
  }
}

export function expectWebhookProducerNotCalled(
  mock: MockWebhookProducer,
  method: keyof MockWebhookProducer,
  triggerEvent?: string
) {
  if (triggerEvent) {
    expect(mock[method]).not.toHaveBeenCalledWith(triggerEvent, expect.anything());
  } else {
    expect(mock[method]).not.toHaveBeenCalled();
  }
}

export function resetMockWebhookProducer(mock: MockWebhookProducer) {
  for (const fn of Object.values(mock)) {
    fn.mockClear();
  }
}
