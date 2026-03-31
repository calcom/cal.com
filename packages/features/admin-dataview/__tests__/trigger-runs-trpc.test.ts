import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRunsList, mockRunsReplay } = vi.hoisted(() => ({
  mockRunsList: vi.fn(),
  mockRunsReplay: vi.fn(),
}));

vi.mock("@trigger.dev/sdk/v3", () => ({
  runs: {
    list: mockRunsList,
    replay: mockRunsReplay,
  },
}));

import { AdminTriggerRunsService } from "../server/trigger-runs.service";

function makeDefaultRun() {
  return {
    id: "run_abc123",
    taskIdentifier: "webhook.deliver",
    status: "COMPLETED" as const,
    createdAt: new Date("2026-03-15T10:00:00Z"),
    updatedAt: new Date("2026-03-15T10:00:05Z"),
    startedAt: new Date("2026-03-15T10:00:01Z"),
    finishedAt: new Date("2026-03-15T10:00:05Z"),
    durationMs: 4000,
    costInCents: 2,
    baseCostInCents: 1,
    tags: ["trigger_event:BOOKING_CREATED", "booking:abc-uid-123"],
    isTest: false,
    env: { id: "env_1", name: "production" },
    // Extra SDK fields that should NOT be exposed
    idempotencyKey: "idk_123",
    version: "v1",
    isQueued: false,
    isExecuting: false,
    isWaiting: false,
    isCompleted: true,
    isSuccess: true,
    isFailed: false,
    isCancelled: false,
    delayedUntil: undefined,
    ttl: undefined,
    expiredAt: undefined,
    metadata: { internal: true },
  };
}

function makeMockRun(overrides: Partial<ReturnType<typeof makeDefaultRun>> = {}) {
  return { ...makeDefaultRun(), ...overrides };
}

describe("AdminTriggerRunsService", () => {
  let service: AdminTriggerRunsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminTriggerRunsService();
  });

  describe("listByTag", () => {
    it("calls runs.list with the correct tag and limit", async () => {
      mockRunsList.mockResolvedValue({ data: [] });

      await service.listByTag({ tag: "booking:abc-uid-123", limit: 10 });

      expect(mockRunsList).toHaveBeenCalledWith({ tag: "booking:abc-uid-123", limit: 10 });
    });

    it("maps run data to the expected response shape", async () => {
      mockRunsList.mockResolvedValue({ data: [makeDefaultRun()] });

      const result = await service.listByTag({ tag: "booking:abc-uid-123", limit: 20 });

      expect(result.runs).toHaveLength(1);
      expect(result.runs[0]).toEqual({
        id: "run_abc123",
        taskIdentifier: "webhook.deliver",
        status: "COMPLETED",
        createdAt: new Date("2026-03-15T10:00:00Z"),
        updatedAt: new Date("2026-03-15T10:00:05Z"),
        startedAt: new Date("2026-03-15T10:00:01Z"),
        finishedAt: new Date("2026-03-15T10:00:05Z"),
        durationMs: 4000,
        costInCents: 2,
        baseCostInCents: 1,
        tags: ["trigger_event:BOOKING_CREATED", "booking:abc-uid-123"],
        isTest: false,
        env: { id: "env_1", name: "production" },
      });
    });

    it("strips extra SDK fields from the response", async () => {
      mockRunsList.mockResolvedValue({ data: [makeDefaultRun()] });

      const result = await service.listByTag({ tag: "booking:test", limit: 20 });
      const run = result.runs[0];

      expect(run).not.toHaveProperty("idempotencyKey");
      expect(run).not.toHaveProperty("version");
      expect(run).not.toHaveProperty("isQueued");
      expect(run).not.toHaveProperty("isExecuting");
      expect(run).not.toHaveProperty("isCompleted");
      expect(run).not.toHaveProperty("isFailed");
      expect(run).not.toHaveProperty("isCancelled");
      expect(run).not.toHaveProperty("metadata");
      expect(run).not.toHaveProperty("delayedUntil");
      expect(run).not.toHaveProperty("ttl");
      expect(run).not.toHaveProperty("expiredAt");
    });

    it("coerces undefined startedAt/finishedAt to null", async () => {
      mockRunsList.mockResolvedValue({
        data: [makeMockRun({ startedAt: undefined, finishedAt: undefined })],
      });

      const result = await service.listByTag({ tag: "booking:test", limit: 20 });

      expect(result.runs[0].startedAt).toBeNull();
      expect(result.runs[0].finishedAt).toBeNull();
    });

    it("maps multiple runs from a page response", async () => {
      mockRunsList.mockResolvedValue({
        data: [
          makeMockRun({ id: "run_1", status: "COMPLETED" }),
          makeMockRun({ id: "run_2", status: "FAILED" }),
          makeMockRun({ id: "run_3", status: "EXECUTING" }),
        ],
      });

      const result = await service.listByTag({ tag: "booking:test", limit: 20 });

      expect(result.runs).toHaveLength(3);
      expect(result.runs[0].id).toBe("run_1");
      expect(result.runs[1].status).toBe("FAILED");
      expect(result.runs[2].status).toBe("EXECUTING");
    });

    it("returns empty runs array when no runs match the tag", async () => {
      mockRunsList.mockResolvedValue({ data: [] });

      const result = await service.listByTag({ tag: "booking:nonexistent", limit: 20 });

      expect(result.runs).toEqual([]);
    });
  });

  describe("replay", () => {
    it("calls runs.replay with the run ID and returns the new run ID", async () => {
      mockRunsReplay.mockResolvedValue({ id: "run_new_456" });

      const result = await service.replay("run_old_123");

      expect(mockRunsReplay).toHaveBeenCalledWith("run_old_123");
      expect(result).toEqual({ newRunId: "run_new_456" });
    });

    it("propagates SDK errors", async () => {
      mockRunsReplay.mockRejectedValue(new Error("Run not found"));

      await expect(service.replay("run_nonexistent")).rejects.toThrow("Run not found");
    });
  });
});
