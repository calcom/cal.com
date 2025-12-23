import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { purchaseTeamOrOrgSubscription } from "@calcom/features/ee/teams/lib/payments";
import { WEBAPP_URL } from "@calcom/lib/constants";

import type { IBillingRepository } from "../repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "../repository/teamBillingData/ITeamBillingDataRepository";
import type { IBillingProviderService } from "../service/billingProvider/IBillingProviderService";
import { TeamBillingPublishResponseStatus } from "../service/teams/ITeamBillingService";
import { TeamBillingService } from "../service/teams/TeamBillingService";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual("@calcom/lib/constants");
  return {
    ...actual,
    WEBAPP_URL: "http://localhost:3000",
  };
});

vi.mock("@calcom/features/ee/teams/lib/payments", () => ({
  purchaseTeamOrOrgSubscription: vi.fn(),
}));
const mockTeam = {
  id: 1,
  metadata: {
    subscriptionId: "sub_123",
    subscriptionItemId: "si_456",
    paymentId: "cs_789",
  },
  isOrganization: true,
  parentId: null,
};

describe("TeamBillingService", () => {
  let teamBillingService: TeamBillingService;
  let mockBillingProviderService: IBillingProviderService;
  let mockTeamBillingDataRepository: ITeamBillingDataRepository;
  let mockBillingRepository: IBillingRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBillingProviderService = {
      handleSubscriptionCancel: vi.fn(),
      handleSubscriptionUpdate: vi.fn(),
      checkoutSessionIsPaid: vi.fn(),
      getSubscriptionStatus: vi.fn(),
      handleEndTrial: vi.fn(),
    } as IBillingProviderService;

    mockTeamBillingDataRepository = {
      find: vi.fn(),
    } as unknown as ITeamBillingDataRepository;

    mockBillingRepository = {
      create: vi.fn(),
    } as unknown as IBillingRepository;

    teamBillingService = new TeamBillingService({
      team: mockTeam,
      billingProviderService: mockBillingProviderService,
      teamBillingDataRepository: mockTeamBillingDataRepository,
      billingRepository: mockBillingRepository,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("cancel", () => {
    it("should cancel the subscription and downgrade the team", async () => {
      await teamBillingService.cancel();

      expect(mockBillingProviderService.handleSubscriptionCancel).toHaveBeenCalledWith("sub_123");
      expect(prismaMock.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          metadata: {},
        },
      });
    });
  });

  describe("publish", () => {
    it("should create a checkout session and update the team", async () => {
      vi.mocked(mockBillingProviderService.checkoutSessionIsPaid).mockResolvedValue(false);
      vi.mocked(purchaseTeamOrOrgSubscription).mockResolvedValue({
        url: "http://checkout.url",
      });
      prismaMock.membership.count.mockResolvedValue(5);
      prismaMock.membership.findFirstOrThrow.mockResolvedValue({ userId: 123 });

      const result = await teamBillingService.publish();
      expect(result).toEqual({
        redirectUrl: "http://checkout.url",
        status: TeamBillingPublishResponseStatus.REQUIRES_PAYMENT,
      });

      expect(prismaMock.membership.count).toHaveBeenCalledWith({ where: { teamId: 1 } });
      expect(prismaMock.membership.findFirstOrThrow).toHaveBeenCalledWith({
        where: { teamId: 1, role: "OWNER" },
        select: { userId: true },
      });
    });
    it("should return upgrade url if upgrade is required", async () => {
      const mockUrl = `${WEBAPP_URL}/api/teams/${mockTeam.id}/upgrade?session_id=cs_789`;
      vi.spyOn(teamBillingService, "checkIfTeamPaymentRequired").mockResolvedValue({
        url: mockUrl,
        paymentId: "cs_789",
        paymentRequired: false,
      });

      const result = await teamBillingService.publish();

      expect(result).toEqual({
        redirectUrl: mockUrl,
        status: TeamBillingPublishResponseStatus.REQUIRES_UPGRADE,
      });
      expect(teamBillingService.checkIfTeamPaymentRequired).toHaveBeenCalled();
    });
  });

  describe("updateQuantity", () => {
    it("should update the subscription quantity", async () => {
      const mockTeamNotOrg = {
        ...mockTeam,
        isOrganization: false,
      };
      const teamBillingServiceNotOrg = new TeamBillingService({
        team: mockTeamNotOrg,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });
      prismaMock.membership.count.mockResolvedValue(10);
      vi.spyOn(teamBillingServiceNotOrg, "checkIfTeamPaymentRequired").mockResolvedValue({
        url: "http://checkout.url",
        paymentId: "cs_789",
        paymentRequired: false,
      });

      await teamBillingServiceNotOrg.updateQuantity();

      expect(mockBillingProviderService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        membershipCount: 10,
      });
    });
  });

  describe("checkIfTeamPaymentRequired", () => {
    it("should return payment required if no paymentId", async () => {
      const mockTeamNoPayment = {
        ...mockTeam,
        metadata: {
          ...mockTeam.metadata,
          paymentId: undefined,
        },
      };
      const teamBillingServiceNoPayment = new TeamBillingService({
        team: mockTeamNoPayment,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      const result = await teamBillingServiceNoPayment.checkIfTeamPaymentRequired();

      expect(result).toEqual({ url: null, paymentId: null, paymentRequired: true });
    });

    it("should return payment required if checkout session is not paid", async () => {
      vi.mocked(mockBillingProviderService.checkoutSessionIsPaid).mockResolvedValue(false);
      const teamBillingServiceWithPayment = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      const result = await teamBillingServiceWithPayment.checkIfTeamPaymentRequired();

      expect(result).toEqual({ url: null, paymentId: "cs_789", paymentRequired: true });
    });

    it("should return upgrade URL if checkout session is paid", async () => {
      vi.mocked(mockBillingProviderService.checkoutSessionIsPaid).mockResolvedValue(true);
      const teamBillingServicePaid = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      const result = await teamBillingServicePaid.checkIfTeamPaymentRequired();

      expect(result).toEqual({
        url: `${WEBAPP_URL}/api/teams/1/upgrade?session_id=cs_789`,
        paymentId: "cs_789",
        paymentRequired: false,
      });
    });
  });

  describe("saveTeamBilling", () => {
    it("should call repository create with billing arguments", async () => {
      const mockBillingArgs = {
        teamId: 1,
        subscriptionId: "sub_org_123",
        subscriptionItemId: "si_org_123",
        customerId: "cus_org_123",
        planName: "ORGANIZATION" as const,
        status: "ACTIVE" as const,
      };

      await teamBillingService.saveTeamBilling(mockBillingArgs);

      expect(mockBillingRepository.create).toHaveBeenCalledWith(mockBillingArgs);
    });

    it("should pass all billing arguments correctly to repository", async () => {
      const mockBillingArgs = {
        teamId: 3,
        subscriptionId: "sub_detailed_789",
        subscriptionItemId: "si_detailed_789",
        customerId: "cus_detailed_789",
        planName: "ENTERPRISE" as const,
        status: "TRIALING" as const,
      };

      await teamBillingService.saveTeamBilling(mockBillingArgs);

      expect(mockBillingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 3,
          subscriptionId: "sub_detailed_789",
          subscriptionItemId: "si_detailed_789",
          customerId: "cus_detailed_789",
          planName: "ENTERPRISE",
          status: "TRIALING",
        })
      );
    });

    it("should propagate repository errors", async () => {
      const mockBillingArgs = {
        teamId: 4,
        subscriptionId: "sub_error_999",
        subscriptionItemId: "si_error_999",
        customerId: "cus_error_999",
        planName: "TEAM" as const,
        status: "ACTIVE" as const,
      };

      const repositoryError = new Error("Database constraint violation");
      vi.mocked(mockBillingRepository.create).mockRejectedValue(repositoryError);

      await expect(teamBillingService.saveTeamBilling(mockBillingArgs)).rejects.toThrow(
        "Database constraint violation"
      );
    });
  });
});
