import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create mock functions first
const mockFindByIdMinimal = vi.fn();
const mockFindManyReservedByOthers = vi.fn();
const mockGetOriginalRescheduledBooking = vi.fn();
const mockGetSession = vi.fn();

// Mock dependencies before importing handler
vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository", () => ({
  EventTypeRepository: class MockEventTypeRepository {
    findByIdMinimal = mockFindByIdMinimal;
  },
}));

vi.mock("@calcom/features/selectedSlots/repositories/PrismaSelectedSlotRepository", () => ({
  PrismaSelectedSlotRepository: class MockPrismaSelectedSlotRepository {
    findManyReservedByOthers = mockFindManyReservedByOthers;
  },
}));

vi.mock("@calcom/features/bookings/lib/handleNewBooking/originalRescheduledBookingUtils", () => ({
  getOriginalRescheduledBooking: (...args: unknown[]) => mockGetOriginalRescheduledBooking(...args),
}));

vi.mock("@calcom/trpc/server/middlewares/sessionMiddleware", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

// Import after mocks are set up
import type { TIsAvailableInputSchema } from "./isAvailable.schema";
import { isAvailableHandler } from "./isAvailable.handler";

const createMockContext = (overrides?: { uid?: string }) => ({
  prisma: {} as any,
  req: {
    cookies: {
      uid: overrides?.uid || "test-uid",
    },
    query: {},
    url: "/api/trpc/viewer.slots.isAvailable",
  } as any,
});

const createSlotInput = (minutesFromNow: number): TIsAvailableInputSchema["slots"][0] => {
  const startTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  return {
    utcStartIso: startTime.toISOString(),
    utcEndIso: endTime.toISOString(),
  };
};

describe("isAvailableHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));

    // Default mock implementations
    mockFindByIdMinimal.mockResolvedValue({
      id: 1,
      minimumBookingNotice: 60, // 60 minutes
      seatsPerTimeSlot: null,
    });
    mockFindManyReservedByOthers.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("without rescheduleUid", () => {
    it("should mark slots as available when outside minimum notice period", async () => {
      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(120)], // 2 hours from now (outside 60 min notice)
        eventTypeId: 1,
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      expect(result.slots[0].status).toBe("available");
    });

    it("should mark slots with minBookNoticeViolation when inside minimum notice period", async () => {
      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(30)], // 30 minutes from now (inside 60 min notice)
        eventTypeId: 1,
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });
  });

  describe("with rescheduleUid (host/organizer bypass)", () => {
    it("should bypass minimum notice for organizer when rescheduling", async () => {
      const currentUserId = 123;
      const organizerUserId = 123;

      mockGetSession.mockResolvedValue({
        user: { id: currentUserId },
      });

      mockGetOriginalRescheduledBooking.mockResolvedValue({
        userId: organizerUserId,
        eventType: {
          id: 1, // Matches input eventTypeId
          hosts: [],
        },
      });

      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(30)], // 30 minutes from now (inside 60 min notice)
        eventTypeId: 1,
        rescheduleUid: "test-reschedule-uid",
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      // Organizer should bypass minimum notice
      expect(result.slots[0].status).toBe("available");
    });
    
    it("should NOT bypass minimum notice if rescheduling unrelated event type", async () => {
      const currentUserId = 123;
      const organizerUserId = 123;
      
      mockGetSession.mockResolvedValue({
        user: { id: currentUserId },
      });

      // User IS the organizer of the booking being rescheduled (Booking A)
      mockGetOriginalRescheduledBooking.mockResolvedValue({
        userId: organizerUserId,
        eventTypeId: 999, // Original booking is for Event Type 999
        eventType: {
          hosts: [],
        },
      });

      // But is checking availability for a DIFFERENT Event Type (Event Type 1)
      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(30)], 
        eventTypeId: 1, // Target is Event Type 1
        rescheduleUid: "test-reschedule-uid",
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      // Should NOT bypass because the rescheduleUid belongs to a different event type
      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });

    it("should NOT bypass minimum notice for event type host who is not the booking organizer", async () => {
      const currentUserId = 456;
      const organizerUserId = 123;
      const hostUserId = 456;

      mockGetSession.mockResolvedValue({
        user: { id: currentUserId },
      });

      mockGetOriginalRescheduledBooking.mockResolvedValue({
        userId: organizerUserId,
        eventType: {
          id: 1, // Matches input eventTypeId
          hosts: [{ userId: hostUserId }],
        },
      });

      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(30)], // 30 minutes from now (inside 60 min notice)
        eventTypeId: 1,
        rescheduleUid: "test-reschedule-uid",
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      // Generic host who is not the booking organizer should NOT bypass
      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });

    it("should NOT bypass minimum notice for non-host/non-organizer", async () => {
      const currentUserId = 999; // Different from organizer and hosts
      const organizerUserId = 123;
      const hostUserId = 456;

      mockGetSession.mockResolvedValue({
        user: { id: currentUserId },
      });

      mockGetOriginalRescheduledBooking.mockResolvedValue({
        userId: organizerUserId,
        eventType: {
          id: 1, // Matches input eventTypeId
          hosts: [{ userId: hostUserId }],
        },
      });

      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(30)], // 30 minutes from now (inside 60 min notice)
        eventTypeId: 1,
        rescheduleUid: "test-reschedule-uid",
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      // Non-host/non-organizer should NOT bypass minimum notice
      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });

    it("should handle errors gracefully and fall back to normal behavior", async () => {
      mockGetSession.mockRejectedValue(new Error("Session error"));

      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(30)], // 30 minutes from now (inside 60 min notice)
        eventTypeId: 1,
        rescheduleUid: "test-reschedule-uid",
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      // Should fall back to normal behavior (not bypass)
      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });
  });

  describe("without session (unauthenticated)", () => {
    it("should not bypass minimum notice when user is not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const input: TIsAvailableInputSchema = {
        slots: [createSlotInput(30)], // 30 minutes from now (inside 60 min notice)
        eventTypeId: 1,
        rescheduleUid: "test-reschedule-uid",
      };

      const result = await isAvailableHandler({
        ctx: createMockContext(),
        input,
      });

      // Unauthenticated user should NOT bypass minimum notice
      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });
  });
});
