import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaRoutingTraceRepository } from "./PrismaRoutingTraceRepository";

describe("PrismaRoutingTraceRepository", () => {
  let repository: PrismaRoutingTraceRepository;

  const mockPrisma = {
    routingTrace: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaRoutingTraceRepository(mockPrisma);
  });

  describe("create", () => {
    it("should create a routing trace with all fields", async () => {
      const trace = [
        {
          domain: "routing_form",
          step: "attribute-logic-evaluated",
          timestamp: Date.now(),
          data: { routeIsFallback: false },
        },
      ];

      const mockResult = {
        id: "trace-1",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      };

      vi.mocked(mockPrisma.routingTrace.create).mockResolvedValue(mockResult);

      const result = await repository.create({
        trace,
        formResponseId: 123,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      });

      expect(mockPrisma.routingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: 123,
          queuedFormResponseId: undefined,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 42,
        },
      });
      expect(result).toEqual({
        id: "trace-1",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      });
    });

    it("should create a routing trace with queuedFormResponseId", async () => {
      const trace = [
        {
          domain: "salesforce",
          step: "salesforce_assignment",
          timestamp: Date.now(),
          data: { email: "owner@example.com" },
        },
      ];

      const mockResult = {
        id: "trace-2",
        createdAt: new Date("2025-01-02T10:00:00Z"),
        trace,
        formResponseId: null,
        queuedFormResponseId: "queued-456",
        bookingUid: "booking-uid-456",
        assignmentReasonId: 100,
      };

      vi.mocked(mockPrisma.routingTrace.create).mockResolvedValue(mockResult);

      const result = await repository.create({
        trace,
        queuedFormResponseId: "queued-456",
        bookingUid: "booking-uid-456",
        assignmentReasonId: 100,
      });

      expect(mockPrisma.routingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: undefined,
          queuedFormResponseId: "queued-456",
          bookingUid: "booking-uid-456",
          assignmentReasonId: 100,
        },
      });
      expect(result).toEqual({
        id: "trace-2",
        createdAt: new Date("2025-01-02T10:00:00Z"),
        trace,
        formResponseId: null,
        queuedFormResponseId: "queued-456",
        bookingUid: "booking-uid-456",
        assignmentReasonId: 100,
      });
    });

    it("should create a routing trace without assignmentReasonId", async () => {
      const trace = [
        {
          domain: "other_domain",
          step: "some_step",
          timestamp: Date.now(),
          data: {},
        },
      ];

      const mockResult = {
        id: "trace-3",
        createdAt: new Date("2025-01-03T10:00:00Z"),
        trace,
        formResponseId: 789,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-789",
        assignmentReasonId: null,
      };

      vi.mocked(mockPrisma.routingTrace.create).mockResolvedValue(mockResult);

      const result = await repository.create({
        trace,
        formResponseId: 789,
        bookingUid: "booking-uid-789",
      });

      expect(mockPrisma.routingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: 789,
          queuedFormResponseId: undefined,
          bookingUid: "booking-uid-789",
          assignmentReasonId: undefined,
        },
      });
      expect(result).toEqual({
        id: "trace-3",
        createdAt: new Date("2025-01-03T10:00:00Z"),
        trace,
        formResponseId: 789,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-789",
        assignmentReasonId: null,
      });
    });

    it("should create a routing trace with multiple trace steps", async () => {
      const trace = [
        {
          domain: "salesforce",
          step: "salesforce_assignment",
          timestamp: Date.now() - 1000,
          data: { email: "owner@example.com", recordType: "Contact", recordId: "003ABC" },
        },
        {
          domain: "routing_form",
          step: "attribute-logic-evaluated",
          timestamp: Date.now(),
          data: { routeIsFallback: false },
        },
      ];

      const mockResult = {
        id: "trace-4",
        createdAt: new Date("2025-01-04T10:00:00Z"),
        trace,
        formResponseId: 111,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-111",
        assignmentReasonId: 50,
      };

      vi.mocked(mockPrisma.routingTrace.create).mockResolvedValue(mockResult);

      const result = await repository.create({
        trace,
        formResponseId: 111,
        bookingUid: "booking-uid-111",
        assignmentReasonId: 50,
      });

      expect(mockPrisma.routingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: 111,
          queuedFormResponseId: undefined,
          bookingUid: "booking-uid-111",
          assignmentReasonId: 50,
        },
      });
      expect(result.trace).toHaveLength(2);
    });

    it("should create a routing trace with empty trace array", async () => {
      const trace: never[] = [];

      const mockResult = {
        id: "trace-5",
        createdAt: new Date("2025-01-05T10:00:00Z"),
        trace,
        formResponseId: 222,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-222",
        assignmentReasonId: null,
      };

      vi.mocked(mockPrisma.routingTrace.create).mockResolvedValue(mockResult);

      const result = await repository.create({
        trace,
        formResponseId: 222,
        bookingUid: "booking-uid-222",
      });

      expect(mockPrisma.routingTrace.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          trace,
          formResponseId: 222,
          queuedFormResponseId: undefined,
          bookingUid: "booking-uid-222",
          assignmentReasonId: undefined,
        },
      });
      expect(result.trace).toEqual([]);
    });
  });

  describe("findByBookingUid", () => {
    it("should return routing trace when found", async () => {
      const trace = [
        {
          domain: "routing_form",
          step: "route_matched",
          timestamp: Date.now(),
          data: { routeId: "route-1", routeName: "Enterprise" },
        },
      ];

      const mockResult = {
        id: "trace-1",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      };

      vi.mocked(mockPrisma.routingTrace.findFirst).mockResolvedValue(mockResult);

      const result = await repository.findByBookingUid("booking-uid-123");

      expect(mockPrisma.routingTrace.findFirst).toHaveBeenCalledWith({
        where: { bookingUid: "booking-uid-123" },
      });
      expect(result).toEqual({
        id: "trace-1",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      });
    });

    it("should return null when routing trace not found", async () => {
      vi.mocked(mockPrisma.routingTrace.findFirst).mockResolvedValue(null);

      const result = await repository.findByBookingUid("non-existent-uid");

      expect(mockPrisma.routingTrace.findFirst).toHaveBeenCalledWith({
        where: { bookingUid: "non-existent-uid" },
      });
      expect(result).toBeNull();
    });

    it("should return routing trace with multiple steps", async () => {
      const trace = [
        {
          domain: "routing_form",
          step: "route_matched",
          timestamp: 1000,
          data: { routeId: "route-1", routeName: "Sales" },
        },
        {
          domain: "salesforce",
          step: "graphql_query_initiated",
          timestamp: 2000,
          data: { email: "user@acme.com", emailDomain: "acme.com" },
        },
        {
          domain: "salesforce",
          step: "salesforce_assignment",
          timestamp: 3000,
          data: { email: "owner@acme.com", recordType: "Contact", recordId: "003ABC" },
        },
      ];

      const mockResult = {
        id: "trace-2",
        createdAt: new Date("2025-01-02T10:00:00Z"),
        trace,
        formResponseId: 456,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-456",
        assignmentReasonId: 100,
      };

      vi.mocked(mockPrisma.routingTrace.findFirst).mockResolvedValue(mockResult);

      const result = await repository.findByBookingUid("booking-uid-456");

      expect(result).not.toBeNull();
      expect(result?.trace).toHaveLength(3);
      expect(result?.trace[0].domain).toBe("routing_form");
      expect(result?.trace[1].domain).toBe("salesforce");
      expect(result?.trace[2].domain).toBe("salesforce");
    });
  });
});
