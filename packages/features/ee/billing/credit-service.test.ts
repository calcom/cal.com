import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import * as EmailManager from "@calcom/emails/email-manager";
import { CreditType } from "@calcom/prisma/enums";

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
    it("should create expense log and send low balance warning email", async ({ emails }) => {
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
        totalRemainingMonthlyCredits: 10,
        additionalCredits: 10,
      });

      const result = await creditService.chargeCredits({
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

      expect(EmailManager.sendCreditBalanceLowWarningEmails).toHaveBeenCalled();
    });
  });

  describe("getTeamToCharge", () => {
    it.skip("should return team with remaining credits", async () => {
      const mockTeam = {
        id: 1,
        credits: {
          limitReachedAt: null,
        },
      };

      (prismaMock.team.findUnique as any).mockResolvedValue(mockTeam);

      const result = await creditService.getTeamToCharge({
        credits: 5,
        teamId: 1,
      });

      expect(result).toEqual({
        teamId: 1,
        remaningCredits: -5,
        creditType: CreditType.ADDITIONAL,
      });
    });
  });
});
