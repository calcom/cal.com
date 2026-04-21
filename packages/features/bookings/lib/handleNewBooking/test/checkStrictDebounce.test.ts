import { describe, expect, it, vi, beforeEach } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { BookingStatus } from "@calcom/prisma/enums";

import { checkStrictDebounce } from "../checkStrictDebounce";

const mockPrismaFindFirst = vi.fn();

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {
    booking: {
      findFirst: mockPrismaFindFirst,
    },
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
    }),
  },
}));

describe("checkStrictDebounce", () => {
  const eventTypeId = 1;
  const bookerEmail = "test@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when strictDebounce is disabled", () => {
    it("should not throw an error", async () => {
      await expect(
        checkStrictDebounce({
          eventTypeId,
          strictDebounce: false,
          bookerEmail,
        })
      ).resolves.not.toThrow();

      expect(mockPrismaFindFirst).not.toHaveBeenCalled();
    });
  });

  describe("when strictDebounce is enabled", () => {
    describe("when no existing booking found within 24 hours", () => {
      it("should not throw an error", async () => {
        mockPrismaFindFirst.mockResolvedValue(null);

        await expect(
          checkStrictDebounce({
            eventTypeId,
            strictDebounce: true,
            bookerEmail,
          })
        ).resolves.not.toThrow();

        expect(mockPrismaFindFirst).toHaveBeenCalledWith({
          where: {
            eventTypeId,
            createdAt: {
              gte: expect.any(Date),
            },
            status: {
              in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
            },
            attendees: {
              some: {
                email: bookerEmail,
              },
            },
          },
          select: {
            id: true,
            createdAt: true,
          },
        });
      });
    });

    describe("when existing booking found within 24 hours", () => {
      it("should throw StrictDebounceExceeded error", async () => {
        const existingBooking = {
          id: 123,
          createdAt: new Date(),
        };
        mockPrismaFindFirst.mockResolvedValue(existingBooking);

        await expect(
          checkStrictDebounce({
            eventTypeId,
            strictDebounce: true,
            bookerEmail,
          })
        ).rejects.toThrow(ErrorWithCode);

        await expect(
          checkStrictDebounce({
            eventTypeId,
            strictDebounce: true,
            bookerEmail,
          })
        ).rejects.toMatchObject({
          code: ErrorCode.StrictDebounceExceeded,
          message: ErrorCode.StrictDebounceExceeded,
          metadata: {
            bookingId: existingBooking.id,
            bookingCreatedAt: existingBooking.createdAt,
          },
        });
      });
    });

    describe("when existing booking is older than 24 hours", () => {
      it("should not throw an error when Prisma returns null", async () => {
        mockPrismaFindFirst.mockResolvedValue(null);

        await expect(
          checkStrictDebounce({
            eventTypeId,
            strictDebounce: true,
            bookerEmail,
          })
        ).resolves.not.toThrow();
      });
    });
  });
});
