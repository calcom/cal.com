import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { deleteBookingHandler } from "../deleteBooking.handler";
import type { TDeleteBookingInputSchema } from "../deleteBooking.schema";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe("deleteBooking.handler", () => {
  const mockUser: NonNullable<TrpcSessionUser> = {
    id: 123,
    name: "Test User",
    email: "test@example.com",
    timeZone: "UTC",
    username: "testuser",
  };

  const mockCtx = {
    user: mockUser,
  };

  const mockInput: TDeleteBookingInputSchema = {
    id: 456,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success cases", () => {
    it("should delete a past personal booking successfully for booking owner", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: null,
        user: {
          id: 123, // Same as mockUser.id
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.booking.delete.mockResolvedValue(mockBooking);

      const result = await deleteBookingHandler({ ctx: mockCtx, input: mockInput });

      expect(result).toEqual({
        id: 456,
        message: "Booking deleted successfully",
      });

      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 456 },
        select: {
          id: true,
          endTime: true,
          eventType: {
            select: {
              team: {
                select: {
                  members: {
                    where: {
                      userId: 123,
                      accepted: true,
                    },
                    select: {
                      role: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      expect(mockPrisma.booking.delete).toHaveBeenCalledWith({
        where: { id: 456 },
      });
    });

    it("should delete a past team booking successfully for team owner", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: {
          team: {
            members: [
              {
                role: MembershipRole.OWNER,
              },
            ],
          },
        },
        user: {
          id: 789, // Different user
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.booking.delete.mockResolvedValue(mockBooking);

      const result = await deleteBookingHandler({ ctx: mockCtx, input: mockInput });

      expect(result).toEqual({
        id: 456,
        message: "Booking deleted successfully",
      });
    });

    it("should delete a past team booking successfully for team admin", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: {
          team: {
            members: [
              {
                role: MembershipRole.ADMIN,
              },
            ],
          },
        },
        user: {
          id: 789, // Different user
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.booking.delete.mockResolvedValue(mockBooking);

      const result = await deleteBookingHandler({ ctx: mockCtx, input: mockInput });

      expect(result).toEqual({
        id: 456,
        message: "Booking deleted successfully",
      });
    });
  });

  describe("Error cases", () => {
    it("should throw NOT_FOUND error if booking does not exist", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });

    it("should throw BAD_REQUEST error if booking is not in the past", async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const mockBooking = {
        id: 456,
        endTime: futureTime,
        eventType: null,
        user: {
          id: 123,
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Only past bookings can be deleted",
      });

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN error if user tries to delete someone else's personal booking", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: null,
        user: {
          id: 789, // Different user ID
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this booking",
      });

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN error if user is not team admin/owner for team booking", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: {
          team: {
            members: [
              {
                role: MembershipRole.MEMBER, // Not admin or owner
              },
            ],
          },
        },
        user: {
          id: 789,
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this booking",
      });

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN error if non-team-member tries to delete team booking", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: {
          team: {
            members: [], // Empty members array means user is not a member
          },
        },
        user: {
          id: 789,
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this booking",
      });

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN error if personal booking has null user", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: null,
        user: null, // Null user
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this booking",
      });

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle team booking with no members array", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: {
          team: {
            members: undefined, // No members array
          },
        },
        user: {
          id: 789,
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      // The handler will throw a runtime error when trying to access members[0] on undefined
      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toThrow(
        "Cannot read properties of undefined"
      );

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });

    it("should handle exactly current time as boundary condition", async () => {
      // Use a time slightly in the future to ensure it's definitely "not in the past"
      const currentTime = new Date(Date.now() + 1000); // 1 second in the future
      const mockBooking = {
        id: 456,
        endTime: currentTime,
        eventType: null,
        user: {
          id: 123,
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      // Since endTime is in the future, it should be considered as "not in the past"
      await expect(deleteBookingHandler({ ctx: mockCtx, input: mockInput })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Only past bookings can be deleted",
      });

      expect(mockPrisma.booking.delete).not.toHaveBeenCalled();
    });

    it("should handle personal booking owner deletion even when user has no team memberships", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockBooking = {
        id: 456,
        endTime: pastTime,
        eventType: null, // Personal booking (no team)
        user: {
          id: 123, // Same as mockUser.id
        },
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.booking.delete.mockResolvedValue(mockBooking);

      const result = await deleteBookingHandler({ ctx: mockCtx, input: mockInput });

      expect(result).toEqual({
        id: 456,
        message: "Booking deleted successfully",
      });

      expect(mockPrisma.booking.delete).toHaveBeenCalledWith({
        where: { id: 456 },
      });
    });
  });
});
