import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import * as EmailManager from "@calcom/emails/email-manager";
import { CreditType } from "@calcom/prisma/enums";

import { cancelScheduledMessagesAndScheduleEmails } from "../workflows/lib/reminders/reminderScheduler";
import { CreditService } from "./credit-service";

vi.mock("@calcom/prisma", () => ({ prisma: prismaMock }));
vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    IS_SMS_CREDITS_ENABLED: true,
  };
});

describe("CreditService", () => {
  let creditService: CreditService;

  beforeEach(() => {
    creditService = new CreditService();
    vi.clearAllMocks();
  });

  describe("hasAvailableCredits", () => {
    it("should return true if team has not yet reached limit", async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        credits: {
          limitReachedAt: null,
        },
      });

      const noLimitReached = await creditService.hasAvailableCredits({ teamId: 1 });
      expect(noLimitReached).toBe(true);

      prismaMock.team.findUnique.mockResolvedValue({
        credits: {
          limitReachedAt: dayjs().subtract(1, "month").toDate(),
        },
      });

      const limitReachedLastMonth = await creditService.hasAvailableCredits({ teamId: 1 });
      expect(limitReachedLastMonth).toBe(true);
    });

    it("should return false if team limit reached this month", async () => {
      vi.setSystemTime(new Date("2024-06-20T11:59:59Z"));

      prismaMock.team.findUnique.mockResolvedValue({
        credits: {
          limitReachedAt: dayjs().subtract(1, "week").toDate(),
        },
      });

      const result = await creditService.hasAvailableCredits({ teamId: 1 });
      expect(result).toBe(false);
    });
  });

  describe("getTeamWithAvailableCredits", () => {
    it("should return team with available credits", async () => {
      const mockTeams = [
        {
          id: 1,
          teamId: 1,
        },
      ];

      prismaMock.membership.findMany.mockResolvedValue(mockTeams);

      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
        credits: {
          limitReachedAt: null,
        },
      });

      const result = await creditService.getTeamWithAvailableCredits(1);
      expect(result).toEqual({
        teamId: 1,
        availableCredits: 0,
        creditType: CreditType.ADDITIONAL,
      });
    });

    it("should return first team if no team has available credits", async () => {
      const mockTeams = [
        {
          id: 1,
          teamId: 1,
        },
      ];

      prismaMock.membership.findMany.mockResolvedValue(mockTeams);

      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
        credits: {
          limitReachedAt: new Date(),
        },
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
      prismaMock.creditBalance.findUnique.mockResolvedValue({
        id: "1",
        additionalCredits: 10,
        expenseLogs: [],
      });

      const mockTeam = {
        id: 1,
        credits: {
          limitReachedAt: null,
        },
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
      };

      prismaMock.team.findUnique.mockResolvedValue(mockTeam);

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

      expect(prismaMock.creditExpenseLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingUid: "booking-123",
            creditBalanceId: "1",
            creditType: CreditType.MONTHLY,
            credits: 5,
            smsSid: "sms-123",
          }),
        })
      );
      expect(cancelScheduledMessagesAndScheduleEmails).not.toHaveBeenCalled();

      expect(EmailManager.sendCreditBalanceLowWarningEmails).toHaveBeenCalled();
    });

    it("should create expense log and send limit reached email", async () => {
      vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler", () => ({
        cancelScheduledMessagesAndScheduleEmails: vi.fn(),
      }));

      prismaMock.creditBalance.findUnique.mockResolvedValue({
        id: "1",
        additionalCredits: 0,
        expenseLogs: [],
      });

      const mockTeam = {
        id: 1,
        credits: {
          limitReachedAt: null,
        },
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
      };

      prismaMock.team.findUnique.mockResolvedValue(mockTeam);

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

      expect(prismaMock.creditExpenseLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingUid: "booking-123",
            creditBalanceId: "1",
            creditType: CreditType.ADDITIONAL,
            credits: 5,
            smsSid: "sms-123",
          }),
        })
      );

      expect(cancelScheduledMessagesAndScheduleEmails).toHaveBeenCalled();

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
        remaningCredits: 100,
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
        remaningCredits: 20,
        creditType: CreditType.ADDITIONAL,
      });
    });

    it("should return team with available credits when userId is provided", async () => {
      const mockTeam = {
        id: 1,
        credits: {
          limitReachedAt: null,
        },
      };

      prismaMock.membership.findMany.mockResolvedValue([{ id: 1 }]);
      prismaMock.team.findUnique.mockResolvedValue(mockTeam);

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
