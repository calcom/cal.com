import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { RoutingTracePresenter } from "@calcom/features/routing-trace/presenters/RoutingTracePresenter";
import { PrismaRoutingTraceRepository } from "@calcom/features/routing-trace/repositories/PrismaRoutingTraceRepository";
import type { RoutingTrace } from "@calcom/features/routing-trace/repositories/RoutingTraceRepository.interface";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRoutingTraceHandler } from "./getRoutingTrace.handler";

vi.mock("@calcom/features/routing-trace/repositories/PrismaRoutingTraceRepository");
vi.mock("@calcom/features/routing-trace/presenters/RoutingTracePresenter");
vi.mock("@calcom/features/bookings/services/BookingAccessService");
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    app_RoutingForms_FormResponse: {
      findFirst: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

describe("getRoutingTraceHandler", () => {
  const mockRepository = {
    findByBookingUid: vi.fn(),
  };

  const mockBookingAccessService = {
    doesUserIdHaveAccessToBooking: vi.fn(),
  };

  const mockUser = {
    id: 1,
    email: "test@example.com",
  } as NonNullable<TrpcSessionUser>;

  const createCtx = () => ({
    user: mockUser,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PrismaRoutingTraceRepository).mockImplementation(function () {
      return mockRepository;
    });
    vi.mocked(BookingAccessService).mockImplementation(function () {
      return mockBookingAccessService;
    });
    mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
  });

  describe("when routing trace exists in RoutingTrace table", () => {
    it("should return presented steps from permanent routing trace", async () => {
      const trace: RoutingTrace = [
        {
          domain: "routing_form",
          step: "route_matched",
          timestamp: 1000,
          data: { routeId: "route-1", routeName: "Enterprise" },
        },
        {
          domain: "salesforce",
          step: "salesforce_assignment",
          timestamp: 2000,
          data: { email: "owner@acme.com", recordType: "Contact", recordId: "003ABC" },
        },
      ];

      const mockTraceRecord = {
        id: "trace-1",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace,
        formResponseId: 123,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      };

      const presentedSteps = [
        {
          message: 'Route matched: "Enterprise" (ID: route-1)',
          domain: "routing_form",
          step: "route_matched",
          timestamp: 1000,
        },
        {
          message: "Salesforce assignment: owner@acme.com via Contact (ID: 003ABC)",
          domain: "salesforce",
          step: "salesforce_assignment",
          timestamp: 2000,
        },
      ];

      mockRepository.findByBookingUid.mockResolvedValue(mockTraceRecord);
      vi.mocked(RoutingTracePresenter.present).mockReturnValue(presentedSteps);

      const result = await getRoutingTraceHandler({
        ctx: createCtx(),
        input: { bookingUid: "booking-uid-123" },
      });

      expect(mockBookingAccessService.doesUserIdHaveAccessToBooking).toHaveBeenCalledWith({
        userId: mockUser.id,
        bookingUid: "booking-uid-123",
      });
      expect(mockRepository.findByBookingUid).toHaveBeenCalledWith("booking-uid-123");
      expect(RoutingTracePresenter.present).toHaveBeenCalledWith(trace);
      expect(result).toEqual({ steps: presentedSteps });
      expect(prisma.app_RoutingForms_FormResponse.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("when routing trace does not exist in RoutingTrace table", () => {
    it("should fall back to PendingRoutingTrace via form response", async () => {
      const pendingTrace: RoutingTrace = [
        {
          domain: "routing_form",
          step: "attribute-logic-evaluated",
          timestamp: 3000,
          data: { routeName: "Sales", routeIsFallback: false },
        },
      ];

      const mockFormResponse = {
        id: 456,
        routedToBookingUid: "booking-uid-456",
        pendingRoutingTrace: {
          id: "pending-trace-1",
          trace: pendingTrace,
        },
      };

      const presentedSteps = [
        {
          message: 'Attribute logic evaluated: Route: "Sales"',
          domain: "routing_form",
          step: "attribute-logic-evaluated",
          timestamp: 3000,
        },
      ];

      mockRepository.findByBookingUid.mockResolvedValue(null);
      vi.mocked(prisma.app_RoutingForms_FormResponse.findFirst).mockResolvedValue(mockFormResponse);
      vi.mocked(RoutingTracePresenter.present).mockReturnValue(presentedSteps);

      const result = await getRoutingTraceHandler({
        ctx: createCtx(),
        input: { bookingUid: "booking-uid-456" },
      });

      expect(mockRepository.findByBookingUid).toHaveBeenCalledWith("booking-uid-456");
      expect(prisma.app_RoutingForms_FormResponse.findFirst).toHaveBeenCalledWith({
        where: { routedToBookingUid: "booking-uid-456" },
        include: { pendingRoutingTrace: true },
      });
      expect(RoutingTracePresenter.present).toHaveBeenCalledWith(pendingTrace);
      expect(result).toEqual({ steps: presentedSteps });
    });

    it("should return empty steps when form response has no pending trace", async () => {
      const mockFormResponse = {
        id: 789,
        routedToBookingUid: "booking-uid-789",
        pendingRoutingTrace: null,
      };

      mockRepository.findByBookingUid.mockResolvedValue(null);
      vi.mocked(prisma.app_RoutingForms_FormResponse.findFirst).mockResolvedValue(mockFormResponse);

      const result = await getRoutingTraceHandler({
        ctx: createCtx(),
        input: { bookingUid: "booking-uid-789" },
      });

      expect(mockRepository.findByBookingUid).toHaveBeenCalledWith("booking-uid-789");
      expect(prisma.app_RoutingForms_FormResponse.findFirst).toHaveBeenCalled();
      expect(RoutingTracePresenter.present).not.toHaveBeenCalled();
      expect(result).toEqual({ steps: [] });
    });

    it("should return empty steps when form response does not exist", async () => {
      mockRepository.findByBookingUid.mockResolvedValue(null);
      vi.mocked(prisma.app_RoutingForms_FormResponse.findFirst).mockResolvedValue(null);

      const result = await getRoutingTraceHandler({
        ctx: createCtx(),
        input: { bookingUid: "non-existent-uid" },
      });

      expect(mockRepository.findByBookingUid).toHaveBeenCalledWith("non-existent-uid");
      expect(prisma.app_RoutingForms_FormResponse.findFirst).toHaveBeenCalledWith({
        where: { routedToBookingUid: "non-existent-uid" },
        include: { pendingRoutingTrace: true },
      });
      expect(RoutingTracePresenter.present).not.toHaveBeenCalled();
      expect(result).toEqual({ steps: [] });
    });

    it("should return empty steps when pending trace has no trace data", async () => {
      const mockFormResponse = {
        id: 111,
        routedToBookingUid: "booking-uid-111",
        pendingRoutingTrace: {
          id: "pending-trace-2",
          trace: null,
        },
      };

      mockRepository.findByBookingUid.mockResolvedValue(null);
      vi.mocked(prisma.app_RoutingForms_FormResponse.findFirst).mockResolvedValue(mockFormResponse);

      const result = await getRoutingTraceHandler({
        ctx: createCtx(),
        input: { bookingUid: "booking-uid-111" },
      });

      expect(result).toEqual({ steps: [] });
      expect(RoutingTracePresenter.present).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty trace array from permanent routing trace", async () => {
      const mockTraceRecord = {
        id: "trace-empty",
        createdAt: new Date("2025-01-01T10:00:00Z"),
        trace: [],
        formResponseId: 999,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-empty",
        assignmentReasonId: null,
      };

      mockRepository.findByBookingUid.mockResolvedValue(mockTraceRecord);
      vi.mocked(RoutingTracePresenter.present).mockReturnValue([]);

      const result = await getRoutingTraceHandler({
        ctx: createCtx(),
        input: { bookingUid: "booking-uid-empty" },
      });

      expect(RoutingTracePresenter.present).toHaveBeenCalledWith([]);
      expect(result).toEqual({ steps: [] });
    });
  });
});
