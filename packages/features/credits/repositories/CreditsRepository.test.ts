import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { CreditType } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreditsRepository } from "./CreditsRepository";

describe("CreditsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("findCreditBalance", () => {
    it("should use teamId if both userId and teamId are provided", async () => {
      await CreditsRepository.findCreditBalance({ teamId: 1, userId: 5 });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { teamId: 1 },
        select: {
          id: true,
          additionalCredits: true,
          limitReachedAt: true,
          warningSentAt: true,
        },
      });
    });

    it("should use userId if teamId is undefined", async () => {
      await CreditsRepository.findCreditBalance({ userId: 1 });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: {
          id: true,
          additionalCredits: true,
          limitReachedAt: true,
          warningSentAt: true,
        },
      });
    });
  });

  describe("findCreditBalanceWithTeamOrUser", () => {
    it("should use teamId if both userId and teamId are provided", async () => {
      await CreditsRepository.findCreditBalanceWithTeamOrUser({ teamId: 1, userId: 5 });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { teamId: 1 },
        select: expect.objectContaining({
          id: true,
          additionalCredits: true,
          team: expect.any(Object),
        }),
      });
    });

    it("should use userId if teamId is undefined", async () => {
      await CreditsRepository.findCreditBalanceWithTeamOrUser({ userId: 1 });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: expect.objectContaining({
          id: true,
          additionalCredits: true,
          user: expect.any(Object),
        }),
      });
    });
  });

  describe("findCreditBalanceWithExpenseLogs", () => {
    it("should use teamId if both userId and teamId are provided", async () => {
      await CreditsRepository.findCreditBalanceWithExpenseLogs({ teamId: 1, userId: 5 });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { teamId: 1 },
        select: expect.objectContaining({
          additionalCredits: true,
          expenseLogs: expect.any(Object),
        }),
      });
    });

    it("should use userId if teamId is undefined", async () => {
      await CreditsRepository.findCreditBalanceWithExpenseLogs({ userId: 1 });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { teamId: undefined, userId: 1 },
        select: expect.objectContaining({
          additionalCredits: true,
          expenseLogs: expect.any(Object),
        }),
      });
    });

    it("should apply startDate, endDate and creditType to expenseLogs filter", async () => {
      const startDate = new Date("2025-05-01");
      const endDate = new Date("2025-05-31");
      const creditType = CreditType.MONTHLY;

      await CreditsRepository.findCreditBalanceWithExpenseLogs({
        userId: 1,
        startDate,
        endDate,
        creditType,
      });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: {
          additionalCredits: true,
          expenseLogs: {
            where: {
              date: {
                gte: startDate,
                lte: endDate,
              },
              creditType,
            },
            orderBy: {
              date: "desc",
            },
            select: {
              date: true,
              credits: true,
              creditType: true,
              bookingUid: true,
              smsSid: true,
              smsSegments: true,
              email: true,
              phoneNumber: true,
              callDuration: true,
              externalRef: true,
            },
          },
        },
      });
    });

    it("should use correct fallbacks for startDate, endDate and creditType if undefined", async () => {
      const systemTime = new Date("2025-04-20T10:00:00Z");
      vi.setSystemTime(systemTime);

      await CreditsRepository.findCreditBalanceWithExpenseLogs({
        teamId: 1,
      });

      expect(prismaMock.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { teamId: 1 },
        select: {
          additionalCredits: true,
          expenseLogs: {
            where: {
              date: {
                gte: new Date("2025-04-01T00:00:00Z"),
                lte: systemTime,
              },
            },
            orderBy: {
              date: "desc",
            },
            select: {
              date: true,
              credits: true,
              creditType: true,
              bookingUid: true,
              smsSid: true,
              smsSegments: true,
              email: true,
              phoneNumber: true,
              callDuration: true,
              externalRef: true,
            },
          },
        },
      });
    });
  });
});
