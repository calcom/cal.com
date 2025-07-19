import Stripe from "stripe";
import { describe, it, expect, beforeEach, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import * as EmailManager from "@calcom/emails/email-manager";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import prisma from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";

import { CreditService as OriginalCreditService } from "./credit-service";
import { StripeBillingService } from "./stripe-billling-service";
import { InternalTeamBilling } from "./teams/internal-team-billing";

const MOCK_TX = prisma;

vi.mock("@calcom/prisma", () => {
  return {
    default: {
      $transaction: vi.fn((fn) => fn(MOCK_TX)),
    },
  };
});

vi.mock("stripe");

vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    IS_SMS_CREDITS_ENABLED: true,
  };
});

vi.mock("@calcom/prisma/enums", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    CreditType: {
      MONTHLY: "MONTHLY",
      ADDITIONAL: "ADDITIONAL",
    },
  };
});

vi.mock("@calcom/lib/server/repository/credits");
vi.mock("@calcom/lib/server/repository/membership");
vi.mock("@calcom/lib/server/repository/team");
vi.mock("@calcom/emails/email-manager");
vi.mock("../workflows/lib/reminders/reminderScheduler", () => ({
  cancelScheduledMessagesAndScheduleEmails: vi.fn(),
}));

// Create a testable version of CreditService that exposes protected methods
class CreditService extends OriginalCreditService {
  public async _getTeamWithAvailableCredits(
    params: Parameters<OriginalCreditService["_getTeamWithAvailableCredits"]>[0]
  ) {
    return super._getTeamWithAvailableCredits(params);
  }

  public async _getUserOrTeamToCharge(
    params: Parameters<OriginalCreditService["_getUserOrTeamToCharge"]>[0]
  ) {
    return super._getUserOrTeamToCharge(params);
  }

  public async _createExpenseLog(props: Parameters<OriginalCreditService["_createExpenseLog"]>[0]) {
    return super._createExpenseLog(props);
  }

  public async _handleLowCreditBalance(
    params: Parameters<OriginalCreditService["_handleLowCreditBalance"]>[0]
  ) {
    return super._handleLowCreditBalance(params);
  }

  public async _getAllCreditsForTeam(params: Parameters<OriginalCreditService["_getAllCreditsForTeam"]>[0]) {
    return super._getAllCreditsForTeam(params);
  }

  public async _getAllCredits(params: Parameters<OriginalCreditService["_getAllCredits"]>[0]) {
    return super._getAllCredits(params);
  }
}

describe("CreditService", () => {
  let creditService: CreditService;
  let stripeMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    stripeMock = {
      prices: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        retrieve: vi.fn().mockResolvedValue({ id: "price_123", unit_amount: 1000 }),
      },
    };
    (Stripe as any).mockImplementation(() => stripeMock);
    creditService = new CreditService();
  });

  describe("Team credits", () => {
    describe("hasAvailableCredits", () => {
      it("should return true if team has not yet reached limit", async () => {
        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: null,
          warningSentAt: null,
        });

        const noLimitReached = await creditService.hasAvailableCredits({ teamId: 1 });
        expect(noLimitReached).toBe(true);

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: dayjs().subtract(1, "month").toDate(),
          warningSentAt: null,
        });

        const limitReachedLastMonth = await creditService.hasAvailableCredits({ teamId: 1 });
        expect(limitReachedLastMonth).toBe(true);
      });

      it("should return false if team limit reached this month", async () => {
        vi.setSystemTime(new Date("2024-06-20T11:59:59Z"));

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: dayjs().subtract(1, "week").toDate(),
          warningSentAt: null,
        });

        const result = await creditService.hasAvailableCredits({ teamId: 1 });
        expect(result).toBe(false);
      });
    });

    describe("getTeamWithAvailableCredits", () => {
      it("should return team with available credits", async () => {
        vi.mocked(MembershipRepository.findAllAcceptedPublishedTeamMemberships).mockResolvedValue([
          {
            id: 1,
            teamId: 1,
            userId: 1,
            role: "MEMBER",
            accepted: true,
          },
        ]);

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: null,
          warningSentAt: null,
        });

        const result = await creditService.getTeamWithAvailableCredits(1);
        expect(result).toEqual({
          teamId: 1,
          availableCredits: 0,
          creditType: CreditType.ADDITIONAL,
        });
      });

      it("should return first team if no team has available credits", async () => {
        vi.mocked(MembershipRepository.findAllAcceptedPublishedTeamMemberships).mockResolvedValue([
          {
            id: 1,
            teamId: 1,
            userId: 1,
            role: "MEMBER",
            accepted: true,
          },
        ]);

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: new Date(),
          warningSentAt: null,
        });

        const result = await creditService.getTeamWithAvailableCredits(1);
        expect(result).toEqual({
          teamId: 1,
          availableCredits: 0,
          creditType: CreditType.ADDITIONAL,
          limitReached: true,
        });
      });
    });

    describe("chargeCredits", () => {
      it("should create expense log and send low balance warning email", async () => {
        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 10,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.mocked(CreditsRepository.findCreditBalanceWithTeamOrUser).mockResolvedValue({
          id: "1",
          additionalCredits: 10,
          limitReachedAt: null,
          warningSentAt: null,
          team: {
            id: 1,
            name: "team-name",
            members: [
              {
                user: {
                  id: 1,
                  name: "admin",
                  email: "admin@example.com",
                  locale: "en",
                },
              },
            ],
          },
          user: null,
        });

        vi.spyOn(CreditService.prototype, "_getTeamWithAvailableCredits").mockResolvedValue(null);

        vi.spyOn(EmailManager, "sendCreditBalanceLowWarningEmails").mockResolvedValue();

        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 20,
          additionalCredits: 60,
        });

        await creditService.chargeCredits({
          teamId: 1,
          credits: 5,
          bookingUid: "booking-123",
          smsSid: "sms-123",
        });

        expect(CreditsRepository.createCreditExpenseLog).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingUid: "booking-123",
            creditBalanceId: "1",
            creditType: CreditType.MONTHLY,
            credits: 5,
            smsSid: "sms-123",
          }),
          MOCK_TX
        );

        expect(EmailManager.sendCreditBalanceLowWarningEmails).toHaveBeenCalled();
      });

      it("should create expense log and send limit reached email", async () => {
        vi.mocked(CreditsRepository.findCreditBalanceWithTeamOrUser).mockResolvedValue({
          id: "1",
          additionalCredits: 10,
          limitReachedAt: null,
          warningSentAt: null,
          team: {
            id: 1,
            name: "team-name",
            members: [
              {
                user: {
                  id: 1,
                  name: "admin",
                  email: "admin@example.com",
                  locale: "en",
                },
              },
            ],
          },
          user: null,
        });
        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.spyOn(EmailManager, "sendCreditBalanceLimitReachedEmails").mockResolvedValue();

        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: -1,
          additionalCredits: 0,
        });

        await creditService.chargeCredits({
          teamId: 1,
          credits: 5,
          bookingUid: "booking-123",
          smsSid: "sms-123",
        });

        expect(CreditsRepository.createCreditExpenseLog).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingUid: "booking-123",
            creditBalanceId: "1",
            creditType: CreditType.ADDITIONAL,
            credits: 5,
            smsSid: "sms-123",
          }),
          MOCK_TX
        );

        expect(EmailManager.sendCreditBalanceLimitReachedEmails).toHaveBeenCalled();
      });
    });

    describe("getUserOrTeamToCharge", () => {
      it("should return team with remaining credits when teamId is provided", async () => {
        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 100,
          additionalCredits: 50,
        });

        const result = await creditService.getUserOrTeamToCharge({
          credits: 50,
          teamId: 1,
        });

        expect(result).toEqual({
          teamId: 1,
          remainingCredits: 100,
          creditType: CreditType.MONTHLY,
        });
      });

      it("should use additional credits when monthly credits are out", async () => {
        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 0,
          additionalCredits: 50,
        });

        const result = await creditService.getUserOrTeamToCharge({
          credits: 30,
          teamId: 1,
        });

        expect(result).toEqual({
          teamId: 1,
          remainingCredits: 20,
          creditType: CreditType.ADDITIONAL,
        });
      });

      it("should return team with available credits when userId is provided", async () => {
        vi.mocked(MembershipRepository.findAllAcceptedPublishedTeamMemberships).mockResolvedValue([
          { teamId: 1 },
        ]);

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.spyOn(CreditService.prototype, "_getTeamWithAvailableCredits").mockResolvedValue({
          teamId: 1,
          availableCredits: 150,
          creditType: CreditType.MONTHLY,
        });

        const result = await creditService.getUserOrTeamToCharge({
          credits: 50,
          userId: 1,
        });

        expect(result).toEqual({
          teamId: 1,
          availableCredits: 150,
          creditType: CreditType.MONTHLY,
          remainingCredits: 100,
        });
      });
    });

    describe("getMonthlyCredits", () => {
      it("should return 0 if subscription is not active", async () => {
        const mockTeamRepo = {
          findTeamWithMembers: vi.fn().mockResolvedValue({
            id: 1,
            members: [{ accepted: true }],
          }),
        };
        vi.mocked(TeamRepository).mockImplementation(() => mockTeamRepo as any);

        const mockTeamBillingService = {
          getSubscriptionStatus: vi.fn().mockResolvedValue("trialing"),
        };
        vi.spyOn(InternalTeamBilling.prototype, "getSubscriptionStatus").mockImplementation(
          mockTeamBillingService.getSubscriptionStatus
        );

        const result = await creditService.getMonthlyCredits(1);
        expect(result).toBe(0);
      });

      it("should calculate credits based on active members and price", async () => {
        const mockTeamRepo = {
          findTeamWithMembers: vi.fn().mockResolvedValue({
            id: 1,
            members: [{ accepted: true }, { accepted: true }, { accepted: true }],
          }),
        };
        vi.mocked(TeamRepository).mockImplementation(() => mockTeamRepo as any);

        const mockTeamBillingService = {
          getSubscriptionStatus: vi.fn().mockResolvedValue("active"),
        };
        vi.spyOn(InternalTeamBilling.prototype, "getSubscriptionStatus").mockImplementation(
          mockTeamBillingService.getSubscriptionStatus
        );

        const mockStripeBillingService = {
          getPrice: vi.fn().mockResolvedValue({ unit_amount: 1000 }),
        };
        vi.spyOn(StripeBillingService.prototype, "getPrice").mockImplementation(
          mockStripeBillingService.getPrice
        );

        const result = await creditService.getMonthlyCredits(1);
        expect(result).toBe(1500); // (3 members * 1000 price) / 2
      });
    });

    describe("getAllCreditsForTeam", () => {
      it("should calculate total and remaining credits correctly", async () => {
        vi.mocked(CreditsRepository.findCreditBalanceWithExpenseLogs).mockResolvedValue({
          additionalCredits: 100,
          expenseLogs: [
            { credits: 50, date: new Date() },
            { credits: 30, date: new Date() },
          ],
        });

        vi.spyOn(CreditService.prototype, "getMonthlyCredits").mockResolvedValue(500);

        const result = await creditService.getAllCreditsForTeam(1);
        expect(result).toEqual({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 420, // 500 - (50 + 30)
          additionalCredits: 100,
        });
      });

      it("should handle no expense logs", async () => {
        vi.mocked(CreditsRepository.findCreditBalanceWithExpenseLogs).mockResolvedValue({
          additionalCredits: 100,
          expenseLogs: [],
        });

        vi.spyOn(CreditService.prototype, "getMonthlyCredits").mockResolvedValue(500);

        const result = await creditService.getAllCreditsForTeam(1);
        expect(result).toEqual({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 500,
          additionalCredits: 100,
        });
      });
    });
  });

  describe("User credits", () => {
    describe("hasAvailableCredits", () => {
      it("should return true if user has not yet reached limit", async () => {
        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 10,
          limitReachedAt: null,
          warningSentAt: null,
        });
        vi.spyOn(CreditService.prototype, "_getTeamWithAvailableCredits").mockResolvedValue(null);

        const hasAvailableCredits = await creditService.hasAvailableCredits({ userId: 1 });
        expect(hasAvailableCredits).toBe(true);
      });

      it("should return false if user limit reached this month", async () => {
        vi.setSystemTime(new Date("2024-06-20T11:59:59Z"));

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: dayjs().subtract(1, "week").toDate(),
          warningSentAt: null,
        });

        vi.spyOn(CreditService.prototype, "_getTeamWithAvailableCredits").mockResolvedValue(null);

        const result = await creditService.hasAvailableCredits({ userId: 1 });
        expect(result).toBe(false);
      });
    });

    describe("chargeCredits", () => {
      it("should create expense log and send low balance warning email for user", async () => {
        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 10,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.mocked(CreditsRepository.findCreditBalanceWithTeamOrUser).mockResolvedValue({
          id: "1",
          additionalCredits: 10,
          limitReachedAt: null,
          warningSentAt: null,
          user: {
            id: 1,
            name: "user-name",
            email: "user@example.com",
            locale: "en",
          },
          team: null,
        });

        vi.spyOn(CreditService.prototype, "_getTeamWithAvailableCredits").mockResolvedValue(null);

        vi.spyOn(EmailManager, "sendCreditBalanceLowWarningEmails").mockResolvedValue();

        vi.spyOn(CreditService.prototype, "_getAllCredits").mockResolvedValue({
          totalMonthlyCredits: 0,
          totalRemainingMonthlyCredits: 0,
          additionalCredits: 10,
        });

        await creditService.chargeCredits({
          userId: 1,
          credits: 5,
          bookingUid: "booking-123",
          smsSid: "sms-123",
        });

        expect(CreditsRepository.createCreditExpenseLog).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingUid: "booking-123",
            creditBalanceId: "1",
            creditType: CreditType.ADDITIONAL,
            credits: 5,
            smsSid: "sms-123",
          }),
          MOCK_TX
        );

        expect(EmailManager.sendCreditBalanceLowWarningEmails).toHaveBeenCalled();
      });

      it("should create expense log and send limit reached email for user", async () => {
        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.mocked(CreditsRepository.findCreditBalanceWithTeamOrUser).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: null,
          warningSentAt: null,
          team: {
            id: 1,
            name: "team-name",
            members: [
              {
                user: {
                  id: 1,
                  name: "admin",
                  email: "admin@example.com",
                  locale: "en",
                },
              },
            ],
          },
          user: null,
        });

        vi.spyOn(EmailManager, "sendCreditBalanceLimitReachedEmails").mockResolvedValue();

        vi.spyOn(CreditService.prototype, "_getTeamWithAvailableCredits").mockResolvedValue(null);

        vi.spyOn(CreditService.prototype, "_getAllCredits").mockResolvedValue({
          totalMonthlyCredits: 0,
          totalRemainingMonthlyCredits: 0,
          additionalCredits: 2,
        });

        await creditService.chargeCredits({
          userId: 1,
          credits: 5,
          bookingUid: "booking-123",
          smsSid: "sms-123",
        });

        expect(CreditsRepository.createCreditExpenseLog).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingUid: "booking-123",
            creditBalanceId: "1",
            creditType: CreditType.ADDITIONAL,
            credits: 5,
            smsSid: "sms-123",
          }),
          MOCK_TX
        );

        expect(EmailManager.sendCreditBalanceLimitReachedEmails).toHaveBeenCalled();
      });
    });

    describe("getUserOrTeamToCharge", () => {
      it("should return user with remaining credits when userId is provided", async () => {
        vi.spyOn(CreditService.prototype, "_getTeamWithAvailableCredits").mockResolvedValue(null);

        vi.spyOn(CreditService.prototype, "_getAllCredits").mockResolvedValue({
          totalMonthlyCredits: 0,
          totalRemainingMonthlyCredits: 0,
          additionalCredits: 10,
        });
        const result = await creditService.getUserOrTeamToCharge({
          credits: 2,
          userId: 1,
        });

        expect(result).toEqual({
          userId: 1,
          remainingCredits: 8,
          creditType: CreditType.ADDITIONAL,
        });
      });
    });

    it("should skip unpublished platform organizations and return regular team with credits", async () => {
      vi.mocked(MembershipRepository.findAllAcceptedPublishedTeamMemberships).mockResolvedValue([
        { teamId: 2 },
      ]);

      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: "2",
        additionalCredits: 100,
        limitReachedAt: null,
        warningSentAt: null,
      });
      vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
        totalMonthlyCredits: 500,
        totalRemainingMonthlyCredits: 200,
        additionalCredits: 100,
      });
      const result = await creditService.getTeamWithAvailableCredits(1);
      expect(result).toEqual({
        teamId: 2,
        availableCredits: 300,
        creditType: CreditType.MONTHLY,
      });

      expect(MembershipRepository.findAllAcceptedPublishedTeamMemberships).toHaveBeenCalledWith(1, MOCK_TX);
      expect(CreditsRepository.findCreditBalance).toHaveBeenCalledTimes(1);
      expect(CreditsRepository.findCreditBalance).toHaveBeenCalledWith({ teamId: 2 }, MOCK_TX);
    });
  });
});
