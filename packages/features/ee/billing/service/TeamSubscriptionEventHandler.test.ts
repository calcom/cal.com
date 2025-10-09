import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TeamRepository } from "@calcom/lib/server/repository/team";

import type { IBillingRepository, BillingRecord } from "../repository/IBillingRepository";
import { SubscriptionStatus, Plan } from "../repository/IBillingRepository";
import { TeamSubscriptionEventHandler } from "./TeamSubscriptionEventHandler";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      error: vi.fn(),
    }),
  },
}));

vi.mock("../teams/internal-team-billing");

describe("TeamSubscriptionEventHandler", () => {
  let mockBillingRepository: IBillingRepository;
  let mockTeamRepository: Pick<TeamRepository, "findBySubscriptionId">;
  let handler: TeamSubscriptionEventHandler;

  beforeEach(() => {
    vi.resetAllMocks();

    mockBillingRepository = {
      create: vi.fn(),
      getBySubscriptionId: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
    };

    mockTeamRepository = {
      findBySubscriptionId: vi.fn(),
    };

    handler = new TeamSubscriptionEventHandler(mockBillingRepository, mockTeamRepository as TeamRepository);
  });

  describe("handleUpdate", () => {
    const subscriptionData = {
      subscriptionId: "sub_123",
      subscriptionItemId: "si_456",
      customerId: "cus_789",
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    };

    it("should update subscription status when subscription exists in DB and status changed", async () => {
      const existingBilling: BillingRecord = {
        id: "billing_123",
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        customerId: "cus_789",
        planName: Plan.TEAM,
        status: SubscriptionStatus.TRIALING,
      };

      vi.mocked(mockBillingRepository.getBySubscriptionId).mockResolvedValue(existingBilling);

      await handler.handleUpdate(subscriptionData);

      expect(mockBillingRepository.getBySubscriptionId).toHaveBeenCalledWith("sub_123");
      expect(mockBillingRepository.updateSubscriptionStatus).toHaveBeenCalledWith(
        "sub_123",
        SubscriptionStatus.ACTIVE
      );
    });

    it("should not update subscription status when status is the same", async () => {
      const existingBilling: BillingRecord = {
        id: "billing_123",
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        customerId: "cus_789",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      };

      vi.mocked(mockBillingRepository.getBySubscriptionId).mockResolvedValue(existingBilling);

      await handler.handleUpdate(subscriptionData);

      expect(mockBillingRepository.getBySubscriptionId).toHaveBeenCalledWith("sub_123");
      expect(mockBillingRepository.updateSubscriptionStatus).not.toHaveBeenCalled();
    });

    it("should migrate subscription when not found in DB", async () => {
      const mockTeam = {
        id: 1,
        slug: "test-team",
        metadata: {},
        isOrganization: false,
        parentId: null,
        name: "Test Team",
        createdAt: new Date(),
      };

      vi.mocked(mockBillingRepository.getBySubscriptionId).mockResolvedValue(null);
      vi.mocked(mockTeamRepository.findBySubscriptionId).mockResolvedValue(mockTeam);

      const { InternalTeamBilling } = await import("../teams/internal-team-billing");
      const mockSaveTeamBilling = vi.fn();
      const mockInstance = {
        saveTeamBilling: mockSaveTeamBilling,
      };
      vi.mocked(InternalTeamBilling).mockImplementation(() => mockInstance);

      await handler.handleUpdate(subscriptionData);

      expect(mockBillingRepository.getBySubscriptionId).toHaveBeenCalledWith("sub_123");
      expect(mockTeamRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_123");
      expect(InternalTeamBilling).toHaveBeenCalledWith(mockTeam);
      expect(mockSaveTeamBilling).toHaveBeenCalledWith({
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        status: SubscriptionStatus.ACTIVE,
        customerId: "cus_789",
        planName: Plan.TEAM,
      });
    });

    it("should throw error when team not found for subscription", async () => {
      vi.mocked(mockBillingRepository.getBySubscriptionId).mockResolvedValue(null);
      vi.mocked(mockTeamRepository.findBySubscriptionId).mockResolvedValue(null);

      await expect(handler.handleUpdate(subscriptionData)).rejects.toThrow(
        "Team not found for subscription sub_123"
      );

      expect(mockBillingRepository.getBySubscriptionId).toHaveBeenCalledWith("sub_123");
      expect(mockTeamRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_123");
    });
  });
});
