import { purchaseTeamOrOrgSubscription } from "@calcom/features/ee/teams/lib/payments";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import { Plan, SubscriptionStatus } from "../../repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import { TeamBillingPublishResponseStatus } from "./ITeamBillingService";
import { TeamBillingService } from "./TeamBillingService";

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

const shouldApplyMonthlyProration = vi.fn().mockResolvedValue(false);

vi.mock("../billingPeriod/BillingPeriodService", () => ({
  BillingPeriodService: class {
    shouldApplyMonthlyProration = shouldApplyMonthlyProration;
  },
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

const createMockBillingProviderService = (): IBillingProviderService => ({
  handleSubscriptionCancel: vi.fn(),
  handleSubscriptionUpdate: vi.fn(),
  handleSubscriptionCreation: vi.fn(),
  checkoutSessionIsPaid: vi.fn(),
  getSubscriptionStatus: vi.fn(),
  handleEndTrial: vi.fn(),
  createCustomer: vi.fn(),
  createPaymentIntent: vi.fn(),
  createSubscriptionCheckout: vi.fn(),
  createPrice: vi.fn(),
  getPrice: vi.fn(),
  getCheckoutSession: vi.fn(),
  getCustomer: vi.fn(),
  getSubscriptions: vi.fn(),
  updateCustomer: vi.fn(),
  createInvoiceItem: vi.fn(),
  deleteInvoiceItem: vi.fn(),
  createInvoice: vi.fn(),
  finalizeInvoice: vi.fn(),
  getSubscription: vi.fn(),
  getPaymentIntentFailureReason: vi.fn(),
  hasDefaultPaymentMethod: vi.fn(),
});

const createMockTeamBillingDataRepository = (): ITeamBillingDataRepository => ({
  find: vi.fn(),
  findMany: vi.fn(),
  findBySubscriptionId: vi.fn(),
});

const createMockBillingRepository = (): IBillingRepository => ({
  create: vi.fn(),
});

describe("TeamBillingService", () => {
  let mockBillingProviderService: IBillingProviderService;
  let mockTeamBillingDataRepository: ITeamBillingDataRepository;
  let mockBillingRepository: IBillingRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    mockBillingProviderService = createMockBillingProviderService();
    mockTeamBillingDataRepository = createMockTeamBillingDataRepository();
    mockBillingRepository = createMockBillingRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("cancel", () => {
    it("should cancel the subscription and downgrade the team", async () => {
      const teamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

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
      const teamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

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
      const teamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

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
      const teamBillingService = new TeamBillingService({
        team: mockTeamNotOrg,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      prismaMock.membership.count.mockResolvedValue(10);
      vi.spyOn(teamBillingService, "checkIfTeamPaymentRequired").mockResolvedValue({
        url: "http://checkout.url",
        paymentId: "cs_789",
        paymentRequired: false,
      });
      shouldApplyMonthlyProration.mockResolvedValue(false);

      await teamBillingService.updateQuantity();

      expect(mockBillingProviderService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        membershipCount: 10,
      });
    });

    it("should skip subscription updates when monthly proration applies", async () => {
      const mockTeamNotOrg = {
        ...mockTeam,
        isOrganization: false,
      };
      const teamBillingService = new TeamBillingService({
        team: mockTeamNotOrg,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      prismaMock.membership.count.mockResolvedValue(10);
      vi.spyOn(teamBillingService, "checkIfTeamPaymentRequired").mockResolvedValue({
        url: "http://checkout.url",
        paymentId: "cs_789",
        paymentRequired: false,
      });
      shouldApplyMonthlyProration.mockResolvedValue(true);

      await teamBillingService.updateQuantity();

      expect(mockBillingProviderService.handleSubscriptionUpdate).not.toHaveBeenCalled();
    });
  });

  describe("checkIfTeamPaymentRequired", () => {
    it("should return payment required if no paymentId", async () => {
      const teamWithoutPaymentId = {
        ...mockTeam,
        metadata: {
          ...mockTeam.metadata,
          paymentId: undefined,
        },
      };
      const teamBillingService = new TeamBillingService({
        team: teamWithoutPaymentId,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      const result = await teamBillingService.checkIfTeamPaymentRequired();

      expect(result).toEqual({ url: null, paymentId: null, paymentRequired: true });
    });

    it("should return payment required if checkout session is not paid", async () => {
      const teamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      vi.mocked(mockBillingProviderService.checkoutSessionIsPaid).mockResolvedValue(false);

      const result = await teamBillingService.checkIfTeamPaymentRequired();

      expect(result).toEqual({ url: null, paymentId: "cs_789", paymentRequired: true });
    });

    it("should return upgrade URL if checkout session is paid", async () => {
      const teamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      vi.mocked(mockBillingProviderService.checkoutSessionIsPaid).mockResolvedValue(true);
      const result = await teamBillingService.checkIfTeamPaymentRequired();

      expect(result).toEqual({
        url: `${WEBAPP_URL}/api/teams/1/upgrade?session_id=cs_789`,
        paymentId: "cs_789",
        paymentRequired: false,
      });
    });
  });

  describe("saveTeamBilling", () => {
    it("should delegate to billing repository when team is an organization", async () => {
      const mockOrgTeam = {
        id: 1,
        metadata: {},
        isOrganization: true,
        parentId: null,
      };

      const mockBillingArgs = {
        teamId: 1,
        subscriptionId: "sub_org_123",
        subscriptionItemId: "si_org_123",
        customerId: "cus_org_123",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "billing_org_123",
        ...mockBillingArgs,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockBillingRepository.create).mockResolvedValue(mockCreatedRecord);

      const teamBillingService = new TeamBillingService({
        team: mockOrgTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      await teamBillingService.saveTeamBilling(mockBillingArgs);

      expect(mockBillingRepository.create).toHaveBeenCalledWith(mockBillingArgs);
    });

    it("should delegate to billing repository when team is not an organization", async () => {
      const mockRegularTeam = {
        id: 2,
        metadata: {},
        isOrganization: false,
        parentId: null,
      };

      const mockBillingArgs = {
        teamId: 2,
        subscriptionId: "sub_team_456",
        subscriptionItemId: "si_team_456",
        customerId: "cus_team_456",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "billing_team_456",
        ...mockBillingArgs,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockBillingRepository.create).mockResolvedValue(mockCreatedRecord);

      const teamBillingService = new TeamBillingService({
        team: mockRegularTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      await teamBillingService.saveTeamBilling(mockBillingArgs);

      expect(mockBillingRepository.create).toHaveBeenCalledWith(mockBillingArgs);
    });

    it("should pass all billing arguments correctly to repository", async () => {
      const mockTeam = {
        id: 3,
        metadata: {},
        isOrganization: false,
        parentId: null,
      };

      const mockBillingArgs = {
        teamId: 3,
        subscriptionId: "sub_detailed_789",
        subscriptionItemId: "si_detailed_789",
        customerId: "cus_detailed_789",
        planName: Plan.ENTERPRISE,
        status: SubscriptionStatus.TRIALING,
      };

      const mockCreatedRecord = {
        id: "billing_detailed_789",
        ...mockBillingArgs,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockBillingRepository.create).mockResolvedValue(mockCreatedRecord);

      const teamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      await teamBillingService.saveTeamBilling(mockBillingArgs);

      expect(mockBillingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 3,
          subscriptionId: "sub_detailed_789",
          subscriptionItemId: "si_detailed_789",
          customerId: "cus_detailed_789",
          planName: Plan.ENTERPRISE,
          status: SubscriptionStatus.TRIALING,
        })
      );
    });

    it("should propagate repository errors", async () => {
      const mockTeam = {
        id: 4,
        metadata: {},
        isOrganization: false,
        parentId: null,
      };

      const mockBillingArgs = {
        teamId: 4,
        subscriptionId: "sub_error_999",
        subscriptionItemId: "si_error_999",
        customerId: "cus_error_999",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      };

      const repositoryError = new Error("Database constraint violation");
      vi.mocked(mockBillingRepository.create).mockRejectedValue(repositoryError);

      const teamBillingService = new TeamBillingService({
        team: mockTeam,
        billingProviderService: mockBillingProviderService,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepository: mockBillingRepository,
      });

      await expect(teamBillingService.saveTeamBilling(mockBillingArgs)).rejects.toThrow(
        "Database constraint violation"
      );
    });
  });
});
