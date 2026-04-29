import { describe, expect, it, vi, beforeEach } from "vitest";

import type { NextApiRequest } from "next";
import { PrismaClient } from "@calcom/prisma";
import type { TIsAvailableInputSchema } from "./isAvailable.schema";

const mockFindByIdMinimal = vi.fn();

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository", () => ({
  EventTypeRepository: class {
    findByIdMinimal = mockFindByIdMinimal;
  },
}));

vi.mock("@calcom/features/selectedSlots/repositories/PrismaSelectedSlotRepository", () => ({
  PrismaSelectedSlotRepository: class {
    findManyReservedByOthers = vi.fn().mockResolvedValue([]);
  },
}));

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { isAvailableHandler } from "./isAvailable.handler";

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

describe("isAvailable handler - Host Bypass minimumBookingNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockInput = (overrides?: Partial<TIsAvailableInputSchema>): TIsAvailableInputSchema => {
    const defaultInput: TIsAvailableInputSchema = {
      slots: [
        {
          utcStartIso: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          utcEndIso: new Date(Date.now() + 70 * 60 * 1000).toISOString(),
        },
      ],
      eventTypeId: 1,
    };
    return { ...defaultInput, ...overrides };
  };

  const createMockPrisma = (): Partial<PrismaClient> => {
    return {};
  };

  const createMockReq = (cookies: Record<string, string> = {}): NextApiRequest => {
    return {
      cookies,
    } as NextApiRequest;
  };

  describe("When user IS the event type organizer", () => {
    it("should allow organizer to book slots within minimumBookingNotice window", async () => {
      const mockReq = createMockReq({ uid: "test-uid" });

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 101,
        },
      });

      mockFindByIdMinimal.mockResolvedValue({
        id: 1,
        userId: 101,
        minimumBookingNotice: 60,
      });

      const input = createMockInput();
      const mockPrisma = createMockPrisma();

      const result = await isAvailableHandler({
        ctx: {
          prisma: mockPrisma as PrismaClient,
          req: mockReq,
        },
        input,
      });

      expect(result.slots[0].status).toBe("available");
    });
  });

  describe("When user is NOT the organizer", () => {
    it("should block non-organizer from booking slots within minimumBookingNotice window", async () => {
      const mockReq = createMockReq({ uid: "test-uid" });

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 999,
        },
      });

      mockFindByIdMinimal.mockResolvedValue({
        id: 1,
        userId: 101,
        minimumBookingNotice: 60,
      });

      const input = createMockInput();
      const mockPrisma = createMockPrisma();

      const result = await isAvailableHandler({
        ctx: {
          prisma: mockPrisma as PrismaClient,
          req: mockReq,
        },
        input,
      });

      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });
  });

  describe("When no session (unauthenticated user)", () => {
    it("should block unauthenticated user from booking slots within minimumBookingNotice window", async () => {
      const mockReq = createMockReq({});

      mockGetServerSession.mockResolvedValue(null);

      mockFindByIdMinimal.mockResolvedValue({
        id: 1,
        userId: 101,
        minimumBookingNotice: 60,
      });

      const input = createMockInput();
      const mockPrisma = createMockPrisma();

      const result = await isAvailableHandler({
        ctx: {
          prisma: mockPrisma as PrismaClient,
          req: mockReq,
        },
        input,
      });

      expect(result.slots[0].status).toBe("minBookNoticeViolation");
    });
  });

  describe("When slot is outside minimumBookingNotice window", () => {
    it("should allow both organizer and non-organizer to book slots outside the minimum notice window", async () => {
      const mockReq = createMockReq({ uid: "test-uid" });

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 999,
        },
      });

      mockFindByIdMinimal.mockResolvedValue({
        id: 1,
        userId: 101,
        minimumBookingNotice: 60,
      });

      const input = createMockInput({
        slots: [
          {
            utcStartIso: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
            utcEndIso: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
          },
        ],
      });
      const mockPrisma = createMockPrisma();

      const result = await isAvailableHandler({
        ctx: {
          prisma: mockPrisma as PrismaClient,
          req: mockReq,
        },
        input,
      });

      expect(result.slots[0].status).toBe("available");
    });
  });

  describe("When minimumBookingNotice is 0", () => {
    it("should allow booking with no minimum notice requirement", async () => {
      const mockReq = createMockReq({ uid: "test-uid" });

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 999,
        },
      });

      mockFindByIdMinimal.mockResolvedValue({
        id: 1,
        userId: 101,
        minimumBookingNotice: 0,
      });

      const input = createMockInput();
      const mockPrisma = createMockPrisma();

      const result = await isAvailableHandler({
        ctx: {
          prisma: mockPrisma as PrismaClient,
          req: mockReq,
        },
        input,
      });

      expect(result.slots[0].status).toBe("available");
    });
  });
});