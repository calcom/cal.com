import { describe, expect, it, vi, beforeEach } from "vitest";

import type { WebhookTaskConsumer } from "../service/WebhookTaskConsumer";
import type { WebhookTaskPayload } from "../types/webhookTask";
import { WebhookAsyncTasker } from "./WebhookAsyncTasker";
import { WebhookSyncTasker } from "./WebhookSyncTasker";

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test123456"),
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

describe("WebhookAsyncTasker", () => {
  let mockTasker: { create: ReturnType<typeof vi.fn> };
  let asyncTasker: WebhookAsyncTasker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTasker = {
      create: vi.fn().mockResolvedValue("async-task-id-123"),
    };

    asyncTasker = new WebhookAsyncTasker({
      tasker: mockTasker as never,
    });
  });

  it("should queue webhook delivery to internal tasker", async () => {
    const payload = createMockWebhookTaskPayload();

    const result = await asyncTasker.deliverWebhook(payload);

    expect(mockTasker.create).toHaveBeenCalledTimes(1);
    expect(mockTasker.create).toHaveBeenCalledWith("webhookDelivery", payload);
    expect(result.taskId).toBe("async-task-id-123");
  });

  it("should propagate errors from internal tasker", async () => {
    const payload = createMockWebhookTaskPayload();
    const error = new Error("Tasker queue failed");
    mockTasker.create.mockRejectedValueOnce(error);

    await expect(asyncTasker.deliverWebhook(payload)).rejects.toThrow("Tasker queue failed");
  });

  it("should pass the exact payload to the tasker", async () => {
    const payload = createMockWebhookTaskPayload();
    payload.metadata = { customField: "value" };

    await asyncTasker.deliverWebhook(payload);

    expect(mockTasker.create).toHaveBeenCalledWith("webhookDelivery", payload);
  });
});
