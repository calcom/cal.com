import type { Payment } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleNoShowFee } from "./handleNoShowFee";
import { processNoShowFeeOnCancellation } from "./processNoShowFeeOnCancellation";
import { shouldChargeNoShowCancellationFee } from "./shouldChargeNoShowCancellationFee";

const { mockFindUniqueByUserIdAndTeamId, MockMembershipRepository } = vi.hoisted(() => {
  const mockFindUniqueByUserIdAndTeamId = vi.fn();

  class MockMembershipRepository {
    findUniqueByUserIdAndTeamId = mockFindUniqueByUserIdAndTeamId;
  }

  return { mockFindUniqueByUserIdAndTeamId, MockMembershipRepository };
});

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: MockMembershipRepository,
}));

vi.mock("./handleNoShowFee", () => ({
  handleNoShowFee: vi.fn(),
}));

vi.mock("./shouldChargeNoShowCancellationFee", () => ({
  shouldChargeNoShowCancellationFee: vi.fn(),
}));

describe("processNoShowFeeOnCancellation", () => {
  const mockBooking = {
    id: 1,
    uid: "booking-123",
    title: "Test Meeting",
    startTime: new Date("2024-09-01T10:00:00Z"),
    endTime: new Date("2024-09-01T11:00:00Z"),
    userPrimaryEmail: "organizer@example.com",
    userId: 1,
    user: {
      email: "organizer@example.com",
      name: "John Organizer",
      locale: "en",
      timeZone: "UTC",
    },
    eventType: {
      title: "Test Event Type",
      hideOrganizerEmail: false,
      teamId: null,
      metadata: {},
    },
    attendees: [
      {
        name: "Jane Attendee",
        email: "attendee@example.com",
        timeZone: "UTC",
        locale: "en",
      },
    ],
  };

  const mockHoldPayment: Payment = {
    id: 1,
    uid: "payment-123",
    appId: "stripe",
    bookingId: 1,
    amount: 5000,
    fee: 0,
    currency: "USD",
    success: false,
    refunded: false,
    data: {},
    externalId: "ext_123",
    paymentOption: "HOLD",
  };

  const mockSuccessfulPayment: Payment = {
    ...mockHoldPayment,
    id: 2,
    success: true,
    paymentOption: "ON_BOOKING",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful scenarios", () => {
    it("should successfully process no-show fee when conditions are met", async () => {
      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockResolvedValue({
        id: 999,
        uid: "payment-charged-123",
        appId: "stripe",
        bookingId: 1,
        amount: 5000,
        fee: 0,
        currency: "USD",
        success: true,
        refunded: false,
        data: {},
        externalId: "ext_charged_123",
        paymentOption: "HOLD",
      });

      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).toHaveBeenCalledWith({
        booking: mockBooking,
        eventTypeMetadata: {},
        payment: mockHoldPayment,
      });
      expect(handleNoShowFee).toHaveBeenCalledWith({
        booking: mockBooking,
        payment: mockHoldPayment,
      });
    });

    it("should process no-show fee when cancelled by attendee (no cancelledByUserId)", async () => {
      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockResolvedValue({
        id: 999,
        uid: "payment-charged-123",
        appId: "stripe",
        bookingId: 1,
        amount: 5000,
        fee: 0,
        currency: "USD",
        success: true,
        refunded: false,
        data: {},
        externalId: "ext_charged_123",
        paymentOption: "HOLD",
      });

      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [mockHoldPayment],
      });

      expect(handleNoShowFee).toHaveBeenCalledWith({
        booking: mockBooking,
        payment: mockHoldPayment,
      });
    });
  });

  describe("skip scenarios - organizer cancellation", () => {
    it("should skip no-show fee when cancelled by organizer", async () => {
      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [mockHoldPayment],
        cancelledByUserId: 1,
      });

      expect(shouldChargeNoShowCancellationFee).not.toHaveBeenCalled();
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });
  });

  describe("skip scenarios - team admin cancellation", () => {
    it("should skip no-show fee when cancelled by team admin", async () => {
      const teamBooking = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: 1,
        },
      };

      mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 999,
        teamId: 1,
        role: "ADMIN",
        accepted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        disableImpersonation: false,
        customRoleId: null,
      });

      await processNoShowFeeOnCancellation({
        booking: teamBooking,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(mockFindUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 999,
        teamId: 1,
      });
      expect(shouldChargeNoShowCancellationFee).not.toHaveBeenCalled();
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });

    it("should skip no-show fee when cancelled by team owner", async () => {
      const teamBooking = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: 1,
        },
      };

      mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 999,
        teamId: 1,
        role: "OWNER",
        accepted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        disableImpersonation: false,
        customRoleId: null,
      });

      await processNoShowFeeOnCancellation({
        booking: teamBooking,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).not.toHaveBeenCalled();
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });

    it("should process no-show fee when cancelled by team member (not admin/owner)", async () => {
      const teamBooking = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: 1,
        },
      };

      mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 999,
        teamId: 1,
        role: "MEMBER",
        accepted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        disableImpersonation: false,
        customRoleId: null,
      });
      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockResolvedValue({
        id: 999,
        uid: "payment-charged-123",
        appId: "stripe",
        bookingId: 1,
        amount: 5000,
        fee: 0,
        currency: "USD",
        success: true,
        refunded: false,
        data: {},
        externalId: "ext_charged_123",
        paymentOption: "HOLD",
      });

      await processNoShowFeeOnCancellation({
        booking: teamBooking,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(mockFindUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 999,
        teamId: 1,
      });
      expect(shouldChargeNoShowCancellationFee).toHaveBeenCalled();
      expect(handleNoShowFee).toHaveBeenCalled();
    });

    it("should process no-show fee when cancelled by non-team member", async () => {
      const teamBooking = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: 1,
        },
      };

      mockFindUniqueByUserIdAndTeamId.mockResolvedValue(null);
      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockResolvedValue({
        id: 999,
        uid: "payment-charged-123",
        appId: "stripe",
        bookingId: 1,
        amount: 5000,
        fee: 0,
        currency: "USD",
        success: true,
        refunded: false,
        data: {},
        externalId: "ext_charged_123",
        paymentOption: "HOLD",
      });

      await processNoShowFeeOnCancellation({
        booking: teamBooking,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).toHaveBeenCalled();
      expect(handleNoShowFee).toHaveBeenCalled();
    });
  });

  describe("skip scenarios - payment conditions", () => {
    it("should skip no-show fee when no HOLD payment found", async () => {
      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [mockSuccessfulPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).not.toHaveBeenCalled();
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });

    it("should skip no-show fee when no payments provided", async () => {
      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).not.toHaveBeenCalled();
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });

    it("should use first HOLD payment when multiple exist", async () => {
      const secondHoldPayment: Payment = {
        ...mockHoldPayment,
        id: 3,
        uid: "payment-456",
      };

      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockResolvedValue({
        id: 999,
        uid: "payment-charged-123",
        appId: "stripe",
        bookingId: 1,
        amount: 5000,
        fee: 0,
        currency: "USD",
        success: true,
        refunded: false,
        data: {},
        externalId: "ext_charged_123",
        paymentOption: "HOLD",
      });

      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [mockSuccessfulPayment, mockHoldPayment, secondHoldPayment],
        cancelledByUserId: 999,
      });

      expect(handleNoShowFee).toHaveBeenCalledWith({
        booking: mockBooking,
        payment: mockHoldPayment,
      });
    });
  });

  describe("skip scenarios - time threshold", () => {
    it("should skip no-show fee when outside time threshold", async () => {
      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(false);

      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).toHaveBeenCalledWith({
        booking: mockBooking,
        eventTypeMetadata: {},
        payment: mockHoldPayment,
      });
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });
  });

  describe("error scenarios", () => {
    it("should throw error when handleNoShowFee fails", async () => {
      const error = new Error("Payment processing failed");
      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockRejectedValue(error);

      await expect(
        processNoShowFeeOnCancellation({
          booking: mockBooking,
          payments: [mockHoldPayment],
          cancelledByUserId: 999,
        })
      ).rejects.toThrow("Failed to charge no-show fee with error Error: Payment processing failed");
    });
  });

  describe("edge cases", () => {
    it("should handle booking without event type", async () => {
      const bookingWithoutEventType = {
        ...mockBooking,
        eventType: null,
      };

      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockResolvedValue({
        id: 999,
        uid: "payment-charged-123",
        appId: "stripe",
        bookingId: 1,
        amount: 5000,
        fee: 0,
        currency: "USD",
        success: true,
        refunded: false,
        data: {},
        externalId: "ext_charged_123",
        paymentOption: "HOLD",
      });

      await processNoShowFeeOnCancellation({
        booking: bookingWithoutEventType,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).toHaveBeenCalledWith({
        booking: bookingWithoutEventType,
        eventTypeMetadata: {},
        payment: mockHoldPayment,
      });
      expect(handleNoShowFee).toHaveBeenCalled();
    });

    it("should handle booking with complex event type metadata", async () => {
      const bookingWithMetadata = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          metadata: {
            apps: {
              stripe: {
                enabled: true,
                price: 1000,
                currency: "usd",
                autoChargeNoShowFeeIfCancelled: true,
                paymentOption: "HOLD",
                autoChargeNoShowFeeTimeValue: 2,
                autoChargeNoShowFeeTimeUnit: "hours",
              },
            },
          },
        },
      };

      vi.mocked(shouldChargeNoShowCancellationFee).mockReturnValue(true);
      vi.mocked(handleNoShowFee).mockResolvedValue({
        id: 999,
        uid: "payment-charged-123",
        appId: "stripe",
        bookingId: 1,
        amount: 5000,
        fee: 0,
        currency: "USD",
        success: true,
        refunded: false,
        data: {},
        externalId: "ext_charged_123",
        paymentOption: "HOLD",
      });

      await processNoShowFeeOnCancellation({
        booking: bookingWithMetadata,
        payments: [mockHoldPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).toHaveBeenCalledWith({
        booking: bookingWithMetadata,
        eventTypeMetadata: bookingWithMetadata.eventType.metadata,
        payment: mockHoldPayment,
      });
    });

    it("should handle successful HOLD payment (should still be processed)", async () => {
      const successfulHoldPayment: Payment = {
        ...mockHoldPayment,
        success: true,
      };

      await processNoShowFeeOnCancellation({
        booking: mockBooking,
        payments: [successfulHoldPayment],
        cancelledByUserId: 999,
      });

      expect(shouldChargeNoShowCancellationFee).not.toHaveBeenCalled();
      expect(handleNoShowFee).not.toHaveBeenCalled();
    });
  });
});
