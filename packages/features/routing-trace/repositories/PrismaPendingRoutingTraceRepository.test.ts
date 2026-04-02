import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaPendingRoutingTraceRepository } from "./PrismaPendingRoutingTraceRepository";

describe("PrismaPendingRoutingTraceRepository", () => {
  let repository: PrismaPendingRoutingTraceRepository;

  const mockPrisma = {
    pendingRoutingTrace: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaPendingRoutingTraceRepository(mockPrisma);
  });

  describe("create", () => {
    it("should create a pending routing trace with formResponseId", async () => {
      const trace = [
        {
          domain: "routing_form",
          step: "attribute-logic-evaluated",
          timestamp: Date.now(),
          data: { routeIsFallback: false },
        },
      ];

      vi.mocked(mockPrisma.pendingRoutingTrace.create).mockResolvedValue({
        id: "pending-1",
        createdAt: new Date(),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
      });

      await repository.create({
        trace,
        formResponseId: 123,
      });

      expect(mockPrisma.pendingRoutingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: 123,
          queuedFormResponseId: undefined,
        },
      });
    });

    it("should create a pending routing trace with queuedFormResponseId", async () => {
      const trace = [
        {
          domain: "routing_form",
          step: "attribute-logic-evaluated",
          timestamp: Date.now(),
          data: { routeIsFallback: true },
        },
      ];

      vi.mocked(mockPrisma.pendingRoutingTrace.create).mockResolvedValue({
        id: "pending-2",
        createdAt: new Date(),
        trace,
        formResponseId: null,
        queuedFormResponseId: "queued-123",
      });

      await repository.create({
        trace,
        queuedFormResponseId: "queued-123",
      });

      expect(mockPrisma.pendingRoutingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: undefined,
          queuedFormResponseId: "queued-123",
        },
      });
    });

    it("should create a pending routing trace with empty trace array", async () => {
      const trace: never[] = [];

      vi.mocked(mockPrisma.pendingRoutingTrace.create).mockResolvedValue({
        id: "pending-3",
        createdAt: new Date(),
        trace,
        formResponseId: 456,
        queuedFormResponseId: null,
      });

      await repository.create({
        trace,
        formResponseId: 456,
      });

      expect(mockPrisma.pendingRoutingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: 456,
          queuedFormResponseId: undefined,
        },
      });
    });
  });

  describe("findByFormResponseId", () => {
    it("should find a pending routing trace by formResponseId", async () => {
      const trace = [
        {
          domain: "routing_form",
          step: "attribute-logic-evaluated",
          timestamp: Date.now(),
          data: { routeIsFallback: false },
        },
      ];

      const mockResult = {
        id: "pending-1",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
      };

      vi.mocked(mockPrisma.pendingRoutingTrace.findUnique).mockResolvedValue(mockResult);

      const result = await repository.findByFormResponseId(123);

      expect(mockPrisma.pendingRoutingTrace.findUnique).toHaveBeenCalledWith({
        where: { formResponseId: 123 },
      });
      expect(result).toEqual({
        id: "pending-1",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
      });
    });

    it("should return null when no pending routing trace is found", async () => {
      vi.mocked(mockPrisma.pendingRoutingTrace.findUnique).mockResolvedValue(null);

      const result = await repository.findByFormResponseId(999);

      expect(mockPrisma.pendingRoutingTrace.findUnique).toHaveBeenCalledWith({
        where: { formResponseId: 999 },
      });
      expect(result).toBeNull();
    });
  });

  describe("findByQueuedFormResponseId", () => {
    it("should find a pending routing trace by queuedFormResponseId", async () => {
      const trace = [
        {
          domain: "salesforce",
          step: "salesforce_assignment",
          timestamp: Date.now(),
          data: { email: "owner@example.com" },
        },
      ];

      const mockResult = {
        id: "pending-2",
        createdAt: new Date("2025-01-02T10:00:00Z"),
        trace,
        formResponseId: null,
        queuedFormResponseId: "queued-456",
      };

      vi.mocked(mockPrisma.pendingRoutingTrace.findUnique).mockResolvedValue(mockResult);

      const result = await repository.findByQueuedFormResponseId("queued-456");

      expect(mockPrisma.pendingRoutingTrace.findUnique).toHaveBeenCalledWith({
        where: { queuedFormResponseId: "queued-456" },
      });
      expect(result).toEqual({
        id: "pending-2",
        createdAt: new Date("2025-01-02T10:00:00Z"),
        trace,
        formResponseId: null,
        queuedFormResponseId: "queued-456",
      });
    });

    it("should return null when no pending routing trace is found by queuedFormResponseId", async () => {
      vi.mocked(mockPrisma.pendingRoutingTrace.findUnique).mockResolvedValue(null);

      const result = await repository.findByQueuedFormResponseId("non-existent");

      expect(mockPrisma.pendingRoutingTrace.findUnique).toHaveBeenCalledWith({
        where: { queuedFormResponseId: "non-existent" },
      });
      expect(result).toBeNull();
    });
  });
});
