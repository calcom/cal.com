import { describe, it, expect, beforeEach, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import * as EmailManager from "@calcom/emails/billing-email-service";
import { CreditsRepository } from "@calcom/features/credits/repositories/CreditsRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { CreditType } from "@calcom/prisma/enums";

import { CreditService } from "./credit-service";
import { SubscriptionStatus } from "./repository/billing/IBillingRepository";

const MOCK_TX = {
  team: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
  },
};

vi.mock("@calcom/prisma", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      $transaction: vi.fn((fn) => fn(MOCK_TX)),
    },
    prisma: {
      $transaction: vi.fn((fn) => fn(MOCK_TX)),
    },
  };
});

const mockStripe = vi.hoisted(() => ({
  prices: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    retrieve: vi.fn().mockResolvedValue({ id: "price_123", unit_amount: 1000 }),
  },
  customers: {
    create: vi.fn().mockResolvedValue({ id: "cus_123" }),
  },
  subscriptions: {
    cancel: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  checkout: {
    sessions: {
      retrieve: vi.fn(),
    },
  },
  paymentIntents: {
    create: vi.fn(),
  },
}));

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: mockStripe,
}));

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

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
vi.mock("@calcom/features/membership/repositories/MembershipRepository");
vi.mock("@calcom/features/ee/teams/repositories/TeamRepository");
vi.mock("@calcom/features/credits/repositories/CreditsRepository");
vi.mock("@calcom/emails/billing-email-service", () => ({
  sendCreditBalanceLimitReachedEmails: vi.fn().mockResolvedValue(undefined),
  sendCreditBalanceLowWarningEmails: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../workflows/lib/reminders/reminderScheduler", () => ({
  cancelScheduledMessagesAndScheduleEmails: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: vi.fn(),
  getTeamBillingServiceFactory: vi.fn(),
  getTeamBillingDataRepository: vi.fn(),
}));

const creditService = new CreditService();

vi.spyOn(creditService, "_getAllCreditsForTeam").mockResolvedValue({
  totalMonthlyCredits: 10,
  totalRemainingMonthlyCredits: 5,
  additionalCredits: 0,
  totalCreditsUsedThisMonth: 5,
});

vi.spyOn(creditService, "_getTeamWithAvailableCredits").mockResolvedValue({
  availableCredits: 3,
});

vi.spyOn(creditService, "_getAllCredits").mockResolvedValue({
  additionalCredits: 1,
});

describe("CreditService", () => {
  let creditService: CreditService;

  beforeEach(async () => {
    vi.resetAllMocks();

    mockStripe.prices.retrieve.mockResolvedValue({ id: "price_123", unit_amount: 1000 });
    mockStripe.customers.create.mockResolvedValue({ id: "cus_123" });

    creditService = new CreditService();

    vi.mocked(CreditsRepository.findCreditExpenseLogByExternalRef).mockResolvedValue(null);

    const { getBillingProviderService, getTeamBillingServiceFactory } = await import(
      "@calcom/ee/billing/di/containers/Billing"
    );

    const mockBillingProviderService = {
      getPrice: vi.fn().mockResolvedValue({ unit_amount: 1500 }),
    };
    vi.mocked(getBillingProviderService).mockReturnValue(mockBillingProviderService);

    const mockTeamBillingService = {
      getSubscriptionStatus: vi.fn().mockResolvedValue("active"),
    };
    const mockTeamBillingServiceFactory = {
      init: vi.fn().mockReturnValue(mockTeamBillingService),
      findAndInit: vi.fn().mockResolvedValue(mockTeamBillingService),
      findAndInitMany: vi.fn().mockResolvedValue([mockTeamBillingService]),
    };
    vi.mocked(getTeamBillingServiceFactory).mockReturnValue(mockTeamBillingServiceFactory);
  });

  describe("Team credits", () => {
    describe("hasAvailableCredits", () => {
      it("should return true if team has not yet reached limit", async () => {
        vi.mocked(getOrgIdFromMemberOrTeamId).mockResolvedValue(null);

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

        vi.mocked(getOrgIdFromMemberOrTeamId).mockResolvedValue(null);

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

        vi.spyOn(TeamRepository.prototype, "findTeamsForCreditCheck").mockResolvedValue([
          { id: 1, isOrganization: false, parentId: null, parent: null },
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

        vi.spyOn(TeamRepository.prototype, "findTeamsForCreditCheck").mockResolvedValue([
          { id: 1, isOrganization: false, parentId: null, parent: null },
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
          totalCreditsUsedThisMonth: 480,
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
          totalCreditsUsedThisMonth: 501,
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
          totalCreditsUsedThisMonth: 400,
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
          totalCreditsUsedThisMonth: 500,
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
        vi.mocked(TeamRepository).mockImplementation(function () {
          return mockTeamRepo as unknown as TeamRepository;
        });

        const mockTeamBillingService = {
          getSubscriptionStatus: vi.fn().mockResolvedValue(SubscriptionStatus.TRIALING),
        };
        const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
        vi.mocked(getTeamBillingServiceFactory).mockReturnValue({
          init: vi.fn().mockReturnValue(mockTeamBillingService),
          findAndInit: vi.fn().mockResolvedValue(mockTeamBillingService),
          findAndInitMany: vi.fn().mockResolvedValue([mockTeamBillingService]),
        });

        const result = await creditService.getMonthlyCredits(1);
        expect(result).toBe(0);
      });

      it("should calculate credits based on active members and price", async () => {
        vi.stubEnv("STRIPE_TEAM_MONTHLY_PRICE_ID", "price_team_monthly");
        const mockTeamRepo = {
          findTeamWithMembers: vi.fn().mockResolvedValue({
            id: 1,
            members: [{ accepted: true }, { accepted: true }, { accepted: true }],
          }),
        };
        vi.mocked(TeamRepository).mockImplementation(function () {
          return mockTeamRepo as unknown as TeamRepository;
        });

        const mockTeamBillingService = {
          getSubscriptionStatus: vi.fn().mockResolvedValue(SubscriptionStatus.ACTIVE),
        };
        const mockBillingProviderService = {
          getPrice: vi.fn().mockResolvedValue({ unit_amount: 1000 }),
        };
        const { getBillingProviderService, getTeamBillingServiceFactory } = await import(
          "@calcom/ee/billing/di/containers/Billing"
        );
        vi.mocked(getBillingProviderService).mockReturnValue(mockBillingProviderService);
        vi.mocked(getTeamBillingServiceFactory).mockReturnValue({
          init: vi.fn().mockReturnValue(mockTeamBillingService),
          findAndInit: vi.fn().mockResolvedValue(mockTeamBillingService),
          findAndInitMany: vi.fn().mockResolvedValue([mockTeamBillingService]),
        });

        const result = await creditService.getMonthlyCredits(1);
        expect(result).toBe(1500); // (3 members * 1000 price) / 2
      });

      it("should calculate credits for organizations using ORG_MONTHLY_CREDITS", async () => {
        vi.stubEnv("ORG_MONTHLY_CREDITS", "1500");
        const mockTeamRepo = {
          findTeamWithMembers: vi.fn().mockResolvedValue({
            id: 1,
            isOrganization: true,
            members: [{ accepted: true }, { accepted: true }],
          }),
        };
        vi.mocked(TeamRepository).mockImplementation(function () {
          return mockTeamRepo as unknown as TeamRepository;
        });

        const mockTeamBillingService = {
          getSubscriptionStatus: vi.fn().mockResolvedValue(SubscriptionStatus.ACTIVE),
        };
        const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
        vi.mocked(getTeamBillingServiceFactory).mockReturnValue({
          init: vi.fn().mockReturnValue(mockTeamBillingService),
          findAndInit: vi.fn().mockResolvedValue(mockTeamBillingService),
          findAndInitMany: vi.fn().mockResolvedValue([mockTeamBillingService]),
        });

        const result = await creditService.getMonthlyCredits(1);
        expect(result).toBe(3000); // 2 members * 1500 credits per seat
      });

      it("should calculate credits for organizations with default 1000 credits per seat", async () => {
        vi.stubEnv("ORG_MONTHLY_CREDITS", undefined);
        const mockTeamRepo = {
          findTeamWithMembers: vi.fn().mockResolvedValue({
            id: 1,
            isOrganization: true,
            members: [{ accepted: true }, { accepted: true }, { accepted: true }],
          }),
        };
        vi.mocked(TeamRepository).mockImplementation(function () {
          return mockTeamRepo as unknown as TeamRepository;
        });

        const mockTeamBillingService = {
          getSubscriptionStatus: vi.fn().mockResolvedValue(SubscriptionStatus.ACTIVE),
        };
        const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");
        vi.mocked(getTeamBillingServiceFactory).mockReturnValue({
          init: vi.fn().mockReturnValue(mockTeamBillingService),
          findAndInit: vi.fn().mockResolvedValue(mockTeamBillingService),
          findAndInitMany: vi.fn().mockResolvedValue([mockTeamBillingService]),
        });

        const result = await creditService.getMonthlyCredits(1);
        expect(result).toBe(3000); // 3 members * 1000 credits per seat (default)
      });
    });

    describe("getAllCreditsForTeam", () => {
      it("should calculate total and remaining credits correctly", async () => {
        vi.mocked(CreditsRepository.findCreditBalanceWithExpenseLogs)
          .mockResolvedValueOnce({
            additionalCredits: 100,
            expenseLogs: [
              { credits: 50, date: new Date() },
              { credits: 30, date: new Date() },
            ],
          })
          .mockResolvedValueOnce({
            additionalCredits: 100,
            expenseLogs: [{ credits: 80, date: new Date() }],
          });

        vi.spyOn(CreditService.prototype, "getMonthlyCredits").mockResolvedValue(500);

        const result = await creditService.getAllCreditsForTeam(1);
        expect(result).toEqual({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 420, // 500 - (50 + 30)
          additionalCredits: 100,
          totalCreditsUsedThisMonth: 80, // 50 + 30
        });
      });

      it("should handle no expense logs", async () => {
        vi.mocked(CreditsRepository.findCreditBalanceWithExpenseLogs)
          .mockResolvedValueOnce({
            additionalCredits: 100,
            expenseLogs: [],
          })
          .mockResolvedValueOnce({
            additionalCredits: 100,
            expenseLogs: [],
          });

        vi.spyOn(CreditService.prototype, "getMonthlyCredits").mockResolvedValue(500);

        const result = await creditService.getAllCreditsForTeam(1);
        expect(result).toEqual({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 500,
          additionalCredits: 100,
          totalCreditsUsedThisMonth: 0, // no expenses
        });
      });

      it("should calculate total credits including additional credits for the month", async () => {
        vi.mocked(CreditsRepository.findCreditBalanceWithExpenseLogs)
          .mockResolvedValueOnce({
            additionalCredits: 150,
            expenseLogs: [
              { credits: 80, date: new Date() },
              { credits: 40, date: new Date() },
            ],
          })
          .mockResolvedValueOnce({
            additionalCredits: 150,
            expenseLogs: [
              { credits: 25, date: new Date() },
              { credits: 15, date: new Date() },
            ],
          });

        vi.spyOn(CreditService.prototype, "getMonthlyCredits").mockResolvedValue(500);

        const result = await creditService.getAllCreditsForTeam(1);
        expect(result).toEqual({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 380, // 500 - (80 + 40)
          additionalCredits: 150,
          totalCreditsUsedThisMonth: 120, // 80 + 40
        });
      });

      it("should handle zero additional credits", async () => {
        vi.mocked(CreditsRepository.findCreditBalanceWithExpenseLogs)
          .mockResolvedValueOnce({
            additionalCredits: 0,
            expenseLogs: [{ credits: 100, date: new Date() }],
          })
          .mockResolvedValueOnce({
            additionalCredits: 0,
            expenseLogs: [],
          });

        vi.spyOn(CreditService.prototype, "getMonthlyCredits").mockResolvedValue(500);

        const result = await creditService.getAllCreditsForTeam(1);
        expect(result).toEqual({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 400, // 500 - 100
          additionalCredits: 0,
          totalCreditsUsedThisMonth: 100,
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

      const mockTeamRepoInstance = {
        findTeamsForCreditCheck: vi
          .fn()
          .mockResolvedValue([{ id: 2, isOrganization: false, parentId: null, parent: null }]),
      };
      vi.mocked(TeamRepository).mockImplementation(function () {
        return mockTeamRepoInstance as unknown as TeamRepository;
      });

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
        totalCreditsUsedThisMonth: 300,
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

    describe("Organization priority", () => {
      it("should use organization credits when user belongs to org, ignoring team memberships", async () => {
        vi.mocked(MembershipRepository.findAllAcceptedPublishedTeamMemberships).mockResolvedValue([
          { teamId: 1 },
          { teamId: 2 },
        ]);

        const mockTeamRepoInstance = {
          findTeamsForCreditCheck: vi.fn().mockResolvedValue([
            { id: 1, isOrganization: true, parentId: null, parent: null },
            { id: 2, isOrganization: false, parentId: null, parent: null },
          ]),
        };
        vi.mocked(TeamRepository).mockImplementation(function () {
          return mockTeamRepoInstance as unknown as TeamRepository;
        });

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 50,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 1000,
          totalRemainingMonthlyCredits: 800,
          additionalCredits: 50,
          totalCreditsUsedThisMonth: 200,
        });

        const result = await creditService.getTeamWithAvailableCredits(1);

        expect(result).toEqual({
          teamId: 1,
          availableCredits: 850,
          creditType: CreditType.MONTHLY,
        });
      });

      it("should return org with limitReached when org has no credits, ignoring teams", async () => {
        vi.mocked(MembershipRepository.findAllAcceptedPublishedTeamMemberships).mockResolvedValue([
          { teamId: 1 },
          { teamId: 2 },
        ]);

        const mockTeamRepoInstance = {
          findTeamsForCreditCheck: vi.fn().mockResolvedValue([
            { id: 1, isOrganization: true, parentId: null, parent: null },
            { id: 2, isOrganization: false, parentId: null, parent: null },
          ]),
        };
        vi.mocked(TeamRepository).mockImplementation(function () {
          return mockTeamRepoInstance as unknown as TeamRepository;
        });

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "1",
          additionalCredits: 0,
          limitReachedAt: new Date(),
          warningSentAt: null,
        });

        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 1000,
          totalRemainingMonthlyCredits: 0,
          additionalCredits: 0,
          totalCreditsUsedThisMonth: 1000,
        });

        const result = await creditService.getTeamWithAvailableCredits(1);

        expect(result).toEqual({
          teamId: 1,
          availableCredits: 0,
          creditType: CreditType.ADDITIONAL,
          limitReached: true,
        });
      });

      it("should check teams when user has no org membership", async () => {
        vi.mocked(MembershipRepository.findAllAcceptedPublishedTeamMemberships).mockResolvedValue([
          { teamId: 2 },
        ]);

        const mockTeamRepoInstance = {
          findTeamsForCreditCheck: vi
            .fn()
            .mockResolvedValue([{ id: 2, isOrganization: false, parentId: null, parent: null }]),
        };
        vi.mocked(TeamRepository).mockImplementation(function () {
          return mockTeamRepoInstance as unknown as TeamRepository;
        });

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "2",
          additionalCredits: 100,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 500,
          totalRemainingMonthlyCredits: 300,
          additionalCredits: 100,
          totalCreditsUsedThisMonth: 200,
        });

        const result = await creditService.getTeamWithAvailableCredits(1);

        expect(result).toEqual({
          teamId: 2,
          availableCredits: 400,
          creditType: CreditType.MONTHLY,
        });
      });

      it("should use parent org credits when teamId belongs to org", async () => {
        vi.mocked(getOrgIdFromMemberOrTeamId).mockResolvedValue(100);

        vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
          id: "100",
          additionalCredits: 200,
          limitReachedAt: null,
          warningSentAt: null,
        });

        vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
          totalMonthlyCredits: 2000,
          totalRemainingMonthlyCredits: 1500,
          additionalCredits: 200,
          totalCreditsUsedThisMonth: 500,
        });

        const result = await creditService.hasAvailableCredits({ teamId: 50 });

        expect(result).toBe(true);
      });
    });
  });

  describe("Idempotency", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should detect duplicate charges by externalRef", async () => {
      vi.mocked(CreditsRepository.findCreditExpenseLogByExternalRef).mockResolvedValue({
        id: "existing-log-id",
        credits: 10,
        creditType: CreditType.ADDITIONAL,
        date: new Date(),
        bookingUid: "booking-123",
      });

      const result = await creditService.chargeCredits({
        userId: 1,
        credits: 10,
        externalRef: "retell:duplicate-call-123",
      });

      expect(result).toEqual({
        bookingUid: "booking-123",
        duplicate: true,
        teamId: undefined,
        userId: 1,
      });

      expect(CreditsRepository.findCreditExpenseLogByExternalRef).toHaveBeenCalledWith(
        "retell:duplicate-call-123"
      );
      expect(CreditsRepository.createCreditExpenseLog).not.toHaveBeenCalled();
      expect(CreditsRepository.updateCreditBalance).not.toHaveBeenCalled();
    });

    it("should create expense log with externalRef when not duplicate", async () => {
      vi.mocked(CreditsRepository.findCreditExpenseLogByExternalRef).mockResolvedValue(null);

      vi.mocked(CreditsRepository.findCreditBalanceWithTeamOrUser).mockResolvedValue({
        id: "1",
        additionalCredits: 100,
        limitReachedAt: null,
        warningSentAt: null,
        user: {
          id: 1,
          name: "Test User",
          email: "test@example.com",
          locale: "en",
        },
        team: null,
      });

      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: "1",
        additionalCredits: 100,
        limitReachedAt: null,
        warningSentAt: null,
      });

      vi.spyOn(CreditService.prototype, "_getUserOrTeamToCharge").mockResolvedValue({
        userId: 1,
        remainingCredits: 90,
        creditType: CreditType.ADDITIONAL,
      });

      await creditService.chargeCredits({
        userId: 1,
        credits: 10,
        bookingUid: "booking-456",
        externalRef: "retell:new-call-456",
      });

      expect(CreditsRepository.findCreditExpenseLogByExternalRef).toHaveBeenCalledWith("retell:new-call-456");

      expect(CreditsRepository.createCreditExpenseLog).toHaveBeenCalledWith(
        expect.objectContaining({
          credits: 10,
          creditType: CreditType.ADDITIONAL,
          bookingUid: "booking-456",
          externalRef: "retell:new-call-456",
        }),
        MOCK_TX
      );
    });

    it("should work normally without externalRef", async () => {
      vi.mocked(CreditsRepository.findCreditBalanceWithTeamOrUser).mockResolvedValue({
        id: "1",
        additionalCredits: 100,
        limitReachedAt: null,
        warningSentAt: null,
        team: {
          id: 1,
          name: "Test Team",
          members: [],
        },
        user: null,
      });

      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: "1",
        additionalCredits: 100,
        limitReachedAt: null,
        warningSentAt: null,
      });

      vi.spyOn(CreditService.prototype, "_getAllCreditsForTeam").mockResolvedValue({
        totalMonthlyCredits: 500,
        totalRemainingMonthlyCredits: 100,
        additionalCredits: 100,
        totalCreditsUsedThisMonth: 400,
      });

      await creditService.chargeCredits({
        teamId: 1,
        credits: 10,
        bookingUid: "booking-789",
      });

      expect(CreditsRepository.findCreditExpenseLogByExternalRef).not.toHaveBeenCalled();

      expect(CreditsRepository.createCreditExpenseLog).toHaveBeenCalledWith(
        expect.objectContaining({
          credits: 10,
          bookingUid: "booking-789",
          externalRef: undefined,
        }),
        MOCK_TX
      );
    });
  });
});
