import { describe, expect, it, vi, beforeEach } from "vitest";

import type { WebhookTaskConsumer } from "../service/WebhookTaskConsumer";
import type { WebhookTaskPayload } from "../types/webhookTask";
import { WebhookSyncTasker } from "./WebhookSyncTasker";
import { WebhookTriggerTasker } from "./WebhookTriggerTasker";

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test123456"),
}));

vi.mock("./trigger/deliver-webhook", () => ({
  deliverWebhook: {
    trigger: vi.fn().mockResolvedValue({ id: "trigger-task-id-123" }),
  },
}));

const createMockWebhookTaskPayload = (): WebhookTaskPayload => ({
  operationId: "test-operation-id",
  triggerEvent: "BOOKING_CREATED",
  bookingUid: "test-booking-uid",
  eventTypeId: 1,
  teamId: null,
  userId: 1,
  timestamp: new Date().toISOString(),
});

describe("WebhookSyncTasker", () => {
  let mockWebhookTaskConsumer: WebhookTaskConsumer;
  let syncTasker: WebhookSyncTasker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebhookTaskConsumer = {
      processWebhookTask: vi.fn().mockResolvedValue(undefined),
    } as unknown as WebhookTaskConsumer;

    syncTasker = new WebhookSyncTasker({
      webhookTaskConsumer: mockWebhookTaskConsumer,
    });
  });

  it("should execute webhook delivery immediately via consumer", async () => {
    const payload = createMockWebhookTaskPayload();

    const result = await syncTasker.deliverWebhook(payload);

    expect(mockWebhookTaskConsumer.processWebhookTask).toHaveBeenCalledTimes(1);
    expect(mockWebhookTaskConsumer.processWebhookTask).toHaveBeenCalledWith(
      payload,
      expect.stringMatching(/^sync_/)
    );
    expect(result.taskId).toMatch(/^sync_/);
  });

  it("should generate unique task IDs for each delivery", async () => {
    const payload = createMockWebhookTaskPayload();

    const result1 = await syncTasker.deliverWebhook(payload);
    const result2 = await syncTasker.deliverWebhook(payload);

    expect(result1.taskId).toBe("sync_test123456");
    expect(result2.taskId).toBe("sync_test123456");
    expect(mockWebhookTaskConsumer.processWebhookTask).toHaveBeenCalledTimes(2);
  });

  it("should propagate errors from consumer", async () => {
    const payload = createMockWebhookTaskPayload();
    const error = new Error("Consumer processing failed");
    vi.mocked(mockWebhookTaskConsumer.processWebhookTask).mockRejectedValueOnce(error);

    await expect(syncTasker.deliverWebhook(payload)).rejects.toThrow("Consumer processing failed");
  });
});

describe("WebhookTriggerTasker", () => {
  let triggerTasker: WebhookTriggerTasker;
  let mockLogger: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    triggerTasker = new WebhookTriggerTasker({
      logger: mockLogger as never,
    });
  });

  it("should trigger webhook delivery via trigger.dev", async () => {
    const payload = createMockWebhookTaskPayload();

    const result = await triggerTasker.deliverWebhook(payload);

    expect(result.taskId).toBe("trigger-task-id-123");
  });
});
