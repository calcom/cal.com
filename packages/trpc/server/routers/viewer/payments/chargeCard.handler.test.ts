import { describe, expect, it, vi, beforeEach } from "vitest";

import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { handleNoShowFee } from "@calcom/features/bookings/lib/payment/handleNoShowFee";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import { chargeCardHandler } from "./chargeCard.handler";

vi.mock("@calcom/features/bookings/services/BookingAccessService", () => ({
  BookingAccessService: vi.fn().mockImplementation(() => ({
    doesUserIdHaveAccessToBooking: vi.fn(),
  })),
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    getBookingForPaymentProcessing: vi.fn(),
  })),
}));

vi.mock("@calcom/features/bookings/lib/payment/handleNoShowFee", () => ({
  handleNoShowFee: vi.fn(),
}));

describe("chargeCardHandler", () => {
  const mockPrisma = {} as PrismaClient;
  const mockUser = { id: 1 } as NonNullable<TrpcSessionUser>;

  const mockBookingAccessService = {
    doesUserIdHaveAccessToBooking: vi.fn(),
  };

  const mockBookingRepository = {
    getBookingForPaymentProcessing: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(BookingAccessService).mockImplementation(
      () => mockBookingAccessService as unknown as InstanceType<typeof BookingAccessService>
    );
    vi.mocked(BookingRepository).mockImplementation(
      () => mockBookingRepository as unknown as InstanceType<typeof BookingRepository>
    );
  });

  describe("authorization", () => {
    it("throws UNAUTHORIZED when user does not have access to booking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(
        chargeCardHandler({
          ctx: { prisma: mockPrisma, user: mockUser },
          input: { bookingId: 123 },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to charge this booking",
      });

      expect(mockBookingAccessService.doesUserIdHaveAccessToBooking).toHaveBeenCalledWith({
        userId: mockUser.id,
        bookingId: 123,
      });
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });

    it("proceeds to fetch booking when user is authorized", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepository.getBookingForPaymentProcessing.mockResolvedValue(null);

      await expect(
        chargeCardHandler({
          ctx: { prisma: mockPrisma, user: mockUser },
          input: { bookingId: 123 },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });

      expect(mockBookingRepository.getBookingForPaymentProcessing).toHaveBeenCalledWith(123);
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });
  });

  describe("booking validation", () => {
    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    });

    it("throws NOT_FOUND when booking does not exist", async () => {
      mockBookingRepository.getBookingForPaymentProcessing.mockResolvedValue(null);

      await expect(
        chargeCardHandler({
          ctx: { prisma: mockPrisma, user: mockUser },
          input: { bookingId: 123 },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });

      expect(handleNoShowFee).not.toHaveBeenCalled();
    });

    it("throws BAD_REQUEST when payment already charged", async () => {
      mockBookingRepository.getBookingForPaymentProcessing.mockResolvedValue({
        id: 123,
        payment: [{ success: true }],
      });

      await expect(
        chargeCardHandler({
          ctx: { prisma: mockPrisma, user: mockUser },
          input: { bookingId: 123 },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "The no show fee has already been charged",
      });

      expect(handleNoShowFee).not.toHaveBeenCalled();
    });
  });

  describe("payment processing", () => {
    const mockBooking = {
      id: 123,
      payment: [{ success: false, amount: 1000, currency: "usd" }],
    };

    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepository.getBookingForPaymentProcessing.mockResolvedValue(mockBooking);
    });

    it("successfully charges no show fee", async () => {
      vi.mocked(handleNoShowFee).mockResolvedValue(undefined);

      await expect(
        chargeCardHandler({
          ctx: { prisma: mockPrisma, user: mockUser },
          input: { bookingId: 123 },
        })
      ).resolves.toBeUndefined();

      expect(handleNoShowFee).toHaveBeenCalledWith({
        booking: mockBooking,
        payment: mockBooking.payment[0],
      });
    });

    it("throws INTERNAL_SERVER_ERROR when payment processing fails", async () => {
      vi.mocked(handleNoShowFee).mockRejectedValue(new Error("Payment failed"));

      await expect(
        chargeCardHandler({
          ctx: { prisma: mockPrisma, user: mockUser },
          input: { bookingId: 123 },
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to charge no show fee",
      });
    });
  });
});
