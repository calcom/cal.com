import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CancelDelayedWebhookPayload } from "../../types/webhookTask";
import {
  buildBookingTag,
  CANCELLABLE_RUN_STATUSES,
  cancelRunsByTag,
  type CancelRunsResult,
  fallbackDbCleanup,
  logCancellationSummary,
} from "./cancel-delayed-webhook";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockLogger, mockRuns } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  mockRuns: {
    list: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock("@trigger.dev/sdk", () => ({
  logger: mockLogger,
  runs: mockRuns,
  queue: vi.fn(() => ({})),
  schemaTask: vi.fn((config) => config),
}));

const mockDeleteWebhookScheduledTriggers = vi.fn().mockResolvedValue(undefined);

vi.mock("@calcom/features/webhooks/lib/scheduleTrigger", () => ({
  deleteWebhookScheduledTriggers: mockDeleteWebhookScheduledTriggers,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPayload(overrides?: Partial<CancelDelayedWebhookPayload>): CancelDelayedWebhookPayload {
  return {
    bookingId: 42,
    bookingUid: "booking-uid-abc",
    ...overrides,
  };
}

/**
 * Helper to create a mock async iterable from an array of runs,
 * simulating the trigger.dev `runs.list()` paginated iterator.
 */
function createMockRunsIterator(runsList: Array<{ id: string }>) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const run of runsList) {
        yield run;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CANCELLABLE_RUN_STATUSES", () => {
  it("includes QUEUED and DELAYED", () => {
    expect(CANCELLABLE_RUN_STATUSES).toContain("QUEUED");
    expect(CANCELLABLE_RUN_STATUSES).toContain("DELAYED");
  });

  it("does not include executing or completed states", () => {
    const statuses = [...CANCELLABLE_RUN_STATUSES];
    expect(statuses).not.toContain("EXECUTING");
    expect(statuses).not.toContain("COMPLETED");
    expect(statuses).not.toContain("FAILED");
    expect(statuses).not.toContain("CANCELED");
  });
});

describe("buildBookingTag", () => {
  it("returns tag in booking:{uid} format", () => {
    expect(buildBookingTag("abc-123")).toBe("booking:abc-123");
  });

  it("handles empty string", () => {
    expect(buildBookingTag("")).toBe("booking:");
  });

  it("preserves special characters in uid", () => {
    expect(buildBookingTag("uid-with-dashes-and_underscores")).toBe(
      "booking:uid-with-dashes-and_underscores"
    );
  });
});

describe("cancelRunsByTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero counts when no runs are found", async () => {
    mockRuns.list.mockReturnValue(createMockRunsIterator([]));

    const result = await cancelRunsByTag("booking:abc");

    expect(result).toEqual({ cancelled: 0, failed: 0 });
    expect(mockRuns.cancel).not.toHaveBeenCalled();
  });

  it("cancels a single queued run successfully", async () => {
    mockRuns.list.mockReturnValue(createMockRunsIterator([{ id: "run-1" }]));
    mockRuns.cancel.mockResolvedValue(undefined);

    const result = await cancelRunsByTag("booking:abc");

    expect(result).toEqual({ cancelled: 1, failed: 0 });
    expect(mockRuns.cancel).toHaveBeenCalledWith("run-1");
    expect(mockLogger.info).toHaveBeenCalledWith("Cancelled delayed webhook run", { runId: "run-1" });
  });

  it("cancels multiple runs successfully", async () => {
    mockRuns.list.mockReturnValue(createMockRunsIterator([{ id: "run-1" }, { id: "run-2" }, { id: "run-3" }]));
    mockRuns.cancel.mockResolvedValue(undefined);

    const result = await cancelRunsByTag("booking:abc");

    expect(result).toEqual({ cancelled: 3, failed: 0 });
    expect(mockRuns.cancel).toHaveBeenCalledTimes(3);
  });

  it("counts failed cancellations separately", async () => {
    mockRuns.list.mockReturnValue(createMockRunsIterator([{ id: "run-1" }, { id: "run-2" }]));
    mockRuns.cancel
      .mockResolvedValueOnce(undefined) // run-1 succeeds
      .mockRejectedValueOnce(new Error("cancel failed")); // run-2 fails

    const result = await cancelRunsByTag("booking:abc");

    expect(result).toEqual({ cancelled: 1, failed: 1 });
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to cancel delayed webhook run",
      expect.objectContaining({
        runId: "run-2",
        error: "cancel failed",
      })
    );
  });

  it("handles all cancellations failing", async () => {
    mockRuns.list.mockReturnValue(createMockRunsIterator([{ id: "run-1" }, { id: "run-2" }]));
    mockRuns.cancel.mockRejectedValue(new Error("cancel failed"));

    const result = await cancelRunsByTag("booking:abc");

    expect(result).toEqual({ cancelled: 0, failed: 2 });
  });

  it("logs non-Error values as strings when cancellation fails", async () => {
    mockRuns.list.mockReturnValue(createMockRunsIterator([{ id: "run-1" }]));
    mockRuns.cancel.mockRejectedValue("string error");

    const result = await cancelRunsByTag("booking:abc");

    expect(result).toEqual({ cancelled: 0, failed: 1 });
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to cancel delayed webhook run",
      expect.objectContaining({
        runId: "run-1",
        error: "string error",
      })
    );
  });

  it("passes the tag and cancellable statuses to runs.list", async () => {
    mockRuns.list.mockReturnValue(createMockRunsIterator([]));

    await cancelRunsByTag("booking:test-uid");

    expect(mockRuns.list).toHaveBeenCalledWith({
      tag: ["booking:test-uid"],
      status: [...CANCELLABLE_RUN_STATUSES],
    });
  });
});

describe("fallbackDbCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteWebhookScheduledTriggers with booking id and uid", async () => {
    const payload = createPayload();

    await fallbackDbCleanup(payload);

    expect(mockDeleteWebhookScheduledTriggers).toHaveBeenCalledWith({
      booking: { id: 42, uid: "booking-uid-abc" },
    });
  });

  it("passes through custom booking values", async () => {
    const payload = createPayload({ bookingId: 99, bookingUid: "custom-uid" });

    await fallbackDbCleanup(payload);

    expect(mockDeleteWebhookScheduledTriggers).toHaveBeenCalledWith({
      booking: { id: 99, uid: "custom-uid" },
    });
  });

  it("propagates errors from deleteWebhookScheduledTriggers", async () => {
    mockDeleteWebhookScheduledTriggers.mockRejectedValueOnce(new Error("DB error"));
    const payload = createPayload();

    await expect(fallbackDbCleanup(payload)).rejects.toThrow("DB error");
  });
});

describe("logCancellationSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs the cancellation summary with counts", () => {
    const result: CancelRunsResult = { cancelled: 2, failed: 1 };

    logCancellationSummary("uid-123", result);

    expect(mockLogger.info).toHaveBeenCalledWith("Delayed webhook cancellation complete", {
      bookingUid: "uid-123",
      cancelled: 2,
      failed: 1,
    });
  });

  it("logs zero counts when no runs were found", () => {
    const result: CancelRunsResult = { cancelled: 0, failed: 0 };

    logCancellationSummary("uid-456", result);

    expect(mockLogger.info).toHaveBeenCalledWith("Delayed webhook cancellation complete", {
      bookingUid: "uid-456",
      cancelled: 0,
      failed: 0,
    });
  });
});
