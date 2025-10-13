import { describe, expect, it, vi, beforeEach } from "vitest";

 
import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import { sendNoShowFeeChargedEmail } from "@calcom/emails";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getTranslation } from "@calcom/lib/server/i18n";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { TeamRepository } from "@calcom/lib/server/repository/team";

import { handleNoShowFee } from "./handleNoShowFee";

vi.mock("@calcom/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    stripepayment: Promise.resolve({
      PaymentService: vi.fn().mockImplementation(() => ({
        chargeCard: vi.fn(),
      })),
    }),
  },
}));

vi.mock("@calcom/emails", () => ({
  sendNoShowFeeChargedEmail: vi.fn(),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/server/repository/credential", () => ({
  CredentialRepository: {
    findPaymentCredentialByAppIdAndUserIdOrTeamId: vi.fn(),
    findPaymentCredentialByAppIdAndTeamId: vi.fn(),
  },
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    findUniqueByUserIdAndTeamId: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/repository/team", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    findParentOrganizationByTeamId: vi.fn(),
  })),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
}));

describe("handleNoShowFee", () => {
  let mockPaymentService: { chargeCard: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPaymentService = {
      chargeCard: vi.fn(),
    };

    const paymentServiceModule = await PaymentServiceMap.stripepayment;
    vi.mocked(paymentServiceModule.PaymentService).mockImplementation(() => mockPaymentService);
  });

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

  const mockPayment = {
    id: 1,
    amount: 5000,
    currency: "USD",
    paymentOption: "HOLD",
    appId: "stripepayment",
  };

  const mockCredential = {
    id: 1,
    type: "stripepayment_payment",
    key: { test: "key" },
    userId: 1,
    teamId: null,
    appId: "stripepayment",
    invalid: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    app: {
      keys: { test: "key" },
      slug: "stripepayment",
      createdAt: new Date(),
      updatedAt: new Date(),
      dirName: "stripepayment",
      categories: ["payment"],
      enabled: true,
    },
  };

  describe("successful scenarios", () => {
    it("should successfully process no-show fee for individual user", async () => {
      mockPaymentService.chargeCard.mockResolvedValue({ success: true, paymentId: "pay_123" });

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );
      vi.mocked(sendNoShowFeeChargedEmail).mockResolvedValue(undefined);

      const result = await handleNoShowFee({
        booking: mockBooking,
        payment: mockPayment,
      });

      expect(result).toEqual({ success: true, paymentId: "pay_123" });
      expect(mockPaymentService.chargeCard).toHaveBeenCalledWith(mockPayment, mockBooking.id);
      expect(sendNoShowFeeChargedEmail).toHaveBeenCalled();
    });

    it("should successfully process no-show fee for team event", async () => {
      const teamBooking = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: 1,
        },
      };

      mockPaymentService.chargeCard.mockResolvedValue({ success: true, paymentId: "pay_123" });

      vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 1,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
        disableImpersonation: false,
        accepted: true,
        customRoleId: null,
      });
      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );

      const result = await handleNoShowFee({
        booking: teamBooking,
        payment: mockPayment,
      });

      expect(result).toEqual({ success: true, paymentId: "pay_123" });
      expect(MembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
      });
    });

    it("should find credential from parent organization when team credential not found", async () => {
      const teamBooking = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: 1,
        },
      };

      mockPaymentService.chargeCard.mockResolvedValue({ success: true, paymentId: "pay_123" });

      vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 1,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
        disableImpersonation: false,
        accepted: true,
        customRoleId: null,
      });
      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockCredential);
      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndTeamId).mockResolvedValue(mockCredential);

      const mockTeamRepository = {
        findParentOrganizationByTeamId: vi.fn().mockResolvedValue({ id: 2 }),
      };
      vi.mocked(TeamRepository).mockImplementation(() => mockTeamRepository);

      const result = await handleNoShowFee({
        booking: teamBooking,
        payment: mockPayment,
      });

      expect(result).toEqual({ success: true, paymentId: "pay_123" });
      expect(mockTeamRepository.findParentOrganizationByTeamId).toHaveBeenCalledWith(1);
      expect(CredentialRepository.findPaymentCredentialByAppIdAndTeamId).toHaveBeenCalledWith({
        appId: "stripepayment",
        teamId: 2,
      });
    });
  });

  describe("error scenarios", () => {
    it("should throw error when userId is missing", async () => {
      const bookingWithoutUser = {
        ...mockBooking,
        userId: null,
      };

      await expect(
        handleNoShowFee({
          booking: bookingWithoutUser,
          payment: mockPayment,
        })
      ).rejects.toThrow("User ID is required");
    });

    it("should throw error when user is not a member of the team", async () => {
      const teamBooking = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: 1,
        },
      };

      vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue(null);

      await expect(
        handleNoShowFee({
          booking: teamBooking,
          payment: mockPayment,
        })
      ).rejects.toThrow("User is not a member of the team");
    });

    it("should throw error when no payment credential is found", async () => {
      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockReset();
      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndTeamId).mockReset();

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(null);
      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndTeamId).mockResolvedValue(null);

      const bookingWithoutCredential = {
        ...mockBooking,
        eventType: {
          ...mockBooking.eventType,
          teamId: null,
        },
      };

      await expect(
        handleNoShowFee({
          booking: bookingWithoutCredential,
          payment: mockPayment,
        })
      ).rejects.toThrow("No payment credential found");
    });

    it("should throw error when payment app is not implemented", async () => {
      const paymentWithUnknownApp = {
        ...mockPayment,
        appId: "unknown-app",
      };

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockImplementation(
        async () => ({
          ...mockCredential,
          app: {
            ...mockCredential.app,
            dirName: "unknown-app",
          },
        })
      );

      await expect(
        handleNoShowFee({
          booking: mockBooking,
          payment: paymentWithUnknownApp,
        })
      ).rejects.toThrow("Payment app not implemented");
    });

    it("should throw error when payment service is not found", async () => {
      const originalStripepayment = PaymentServiceMap.stripepayment;
      // @ts-expect-error - Mocking for test
      PaymentServiceMap.stripepayment = Promise.resolve({});

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );

      try {
        await expect(
          handleNoShowFee({
            booking: mockBooking,
            payment: mockPayment,
          })
        ).rejects.toThrow("Payment service not found");
      } finally {
        // @ts-expect-error - Restoring for test
        PaymentServiceMap.stripepayment = originalStripepayment;
      }
    });

    it("should throw error when payment processing fails", async () => {
      mockPaymentService.chargeCard.mockResolvedValue(null);

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );

      await expect(
        handleNoShowFee({
          booking: mockBooking,
          payment: mockPayment,
        })
      ).rejects.toThrow("Payment processing failed");
    });

    it("should handle ChargeCardFailure error with proper message", async () => {
      mockPaymentService.chargeCard.mockRejectedValue(
        new ErrorWithCode(ErrorCode.ChargeCardFailure, "Card declined")
      );

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );
      vi.mocked(getTranslation).mockResolvedValue((key: string) => `Translated: ${key}`);

      await expect(
        handleNoShowFee({
          booking: mockBooking,
          payment: mockPayment,
        })
      ).rejects.toThrow("Translated: Card declined");
    });

    it("should handle generic payment errors", async () => {
      mockPaymentService.chargeCard.mockRejectedValue(new Error("Generic payment error"));

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );
      vi.mocked(getTranslation).mockResolvedValue((key: string) => `Translated: ${key}`);

      await expect(
        handleNoShowFee({
          booking: mockBooking,
          payment: mockPayment,
        })
      ).rejects.toThrow(/Translated: Error processing paymentId 1 with error/);
    });
  });

  describe("edge cases", () => {
    it("should handle booking without event type", async () => {
      const bookingWithoutEventType = {
        ...mockBooking,
        eventType: null,
      };

      mockPaymentService.chargeCard.mockResolvedValue({ success: true, paymentId: "pay_123" });

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );

      const result = await handleNoShowFee({
        booking: bookingWithoutEventType,
        payment: mockPayment,
      });

      expect(result).toEqual({ success: true, paymentId: "pay_123" });
    });

    it("should handle booking without user details", async () => {
      const bookingWithoutUserDetails = {
        ...mockBooking,
        user: null,
      };

      mockPaymentService.chargeCard.mockResolvedValue({ success: true, paymentId: "pay_123" });

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );

      const result = await handleNoShowFee({
        booking: bookingWithoutUserDetails,
        payment: mockPayment,
      });

      expect(result).toEqual({ success: true, paymentId: "pay_123" });
    });

    it("should handle attendees without locale", async () => {
      const bookingWithAttendeesWithoutLocale = {
        ...mockBooking,
        attendees: [
          {
            name: "Jane Attendee",
            email: "attendee@example.com",
            timeZone: "UTC",
            locale: null,
          },
        ],
      };

      mockPaymentService.chargeCard.mockResolvedValue({ success: true, paymentId: "pay_123" });

      vi.mocked(CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId).mockResolvedValue(
        mockCredential
      );

      const result = await handleNoShowFee({
        booking: bookingWithAttendeesWithoutLocale,
        payment: mockPayment,
      });

      expect(result).toEqual({ success: true, paymentId: "pay_123" });
      expect(getTranslation).toHaveBeenCalledWith("en", "common");
    });
  });
});
