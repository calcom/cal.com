import { describe, it, expect, beforeEach, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import * as EmailManager from "@calcom/emails/email-manager";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { CreditType } from "@calcom/prisma/enums";

import { CreditService } from "./credit-service";

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

describe("CreditService", () => {
  let creditService: CreditService;

  beforeEach(() => {
    creditService = new CreditService();
    vi.clearAllMocks();
  });

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
      vi.mocked(MembershipRepository.findAllAcceptedMemberships).mockResolvedValue([
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
      vi.mocked(MembershipRepository.findAllAcceptedMemberships).mockResolvedValue([
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

      vi.mocked(TeamRepository.findTeamWithAdmins).mockResolvedValue({
        id: 1,
        name: "team-name",
        members: [
          {
            user: {
              name: "admin",
              email: "admin@example.com",
              locale: "en",
            },
          },
        ],
      });

      vi.spyOn(EmailManager, "sendCreditBalanceLowWarningEmails").mockResolvedValue();

      vi.spyOn(CreditService.prototype, "getAllCreditsForTeam").mockResolvedValue({
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
        })
      );

      expect(EmailManager.sendCreditBalanceLowWarningEmails).toHaveBeenCalled();
    });

    it("should create expense log and send limit reached email", async () => {
      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: "1",
        additionalCredits: 0,
        limitReachedAt: null,
        warningSentAt: null,
      });

      vi.mocked(TeamRepository.findTeamWithAdmins).mockResolvedValue({
        id: 1,
        name: "team-name",
        members: [
          {
            user: {
              name: "admin",
              email: "admin@example.com",
              locale: "en",
            },
          },
        ],
      });

      vi.spyOn(EmailManager, "sendCreditBalanceLimitReachedEmails").mockResolvedValue();

      vi.spyOn(CreditService.prototype, "getAllCreditsForTeam").mockResolvedValue({
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
        })
      );

      expect(EmailManager.sendCreditBalanceLimitReachedEmails).toHaveBeenCalled();
    });
  });

  describe("getTeamToCharge", () => {
    it("should return team with remaining credits when teamId is provided", async () => {
      vi.spyOn(CreditService.prototype, "getAllCreditsForTeam").mockResolvedValue({
        totalMonthlyCredits: 500,
        totalRemainingMonthlyCredits: 100,
        additionalCredits: 50,
      });

      const result = await creditService.getTeamToCharge({
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
      vi.spyOn(CreditService.prototype, "getAllCreditsForTeam").mockResolvedValue({
        totalMonthlyCredits: 500,
        totalRemainingMonthlyCredits: 0,
        additionalCredits: 50,
      });

      const result = await creditService.getTeamToCharge({
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
      vi.mocked(MembershipRepository.findAllAcceptedMemberships).mockResolvedValue([
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

      vi.spyOn(CreditService.prototype, "getAllCreditsForTeam").mockResolvedValue({
        totalMonthlyCredits: 500,
        totalRemainingMonthlyCredits: 100,
        additionalCredits: 50,
      });

      const result = await creditService.getTeamToCharge({
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
});
