import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { skipTrialForTeamHandler } from "./skipTrialForTeam.handler";

const {
  mockFindUniqueByUserIdAndTeamId,
  mockCheckPermission,
  mockFindById,
  mockGetSubscriptionStatus,
  mockEndTrial,
  mockGetSubscription,
  MockMembershipRepository,
  MockPermissionCheckService,
  MockTeamRepository,
} = vi.hoisted(() => {
  const mockFindUniqueByUserIdAndTeamId = vi.fn();
  const mockCheckPermission = vi.fn();
  const mockFindById = vi.fn();
  const mockGetSubscriptionStatus = vi.fn();
  const mockEndTrial = vi.fn();
  const mockGetSubscription = vi.fn();

  class MockMembershipRepository {
    findUniqueByUserIdAndTeamId = mockFindUniqueByUserIdAndTeamId;
  }

  class MockPermissionCheckService {
    checkPermission = mockCheckPermission;
  }

  class MockTeamRepository {
    findById = mockFindById;
  }

  return {
    mockFindUniqueByUserIdAndTeamId,
    mockCheckPermission,
    mockFindById,
    mockGetSubscriptionStatus,
    mockEndTrial,
    mockGetSubscription,
    MockMembershipRepository,
    MockPermissionCheckService,
    MockTeamRepository,
  };
});

vi.mock("@calcom/lib/constants", () => ({
  IS_TEAM_BILLING_ENABLED: true,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: MockMembershipRepository,
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: MockPermissionCheckService,
}));

vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => ({
  TeamRepository: MockTeamRepository,
}));

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getTeamBillingServiceFactory: vi.fn(() => ({
    init: vi.fn(() => ({
      getSubscriptionStatus: mockGetSubscriptionStatus,
      endTrial: mockEndTrial,
    })),
  })),
  getBillingProviderService: vi.fn(() => ({
    getSubscription: mockGetSubscription,
  })),
}));

describe("skipTrialForTeamHandler", () => {
  const ctx = {
    user: {
      id: 1,
      email: "owner@example.com",
    },
  };

  const input = {
    teamId: 42,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
      accepted: true,
    });
    mockCheckPermission.mockResolvedValue(true);
    mockFindById.mockResolvedValue({
      id: 42,
      isOrganization: false,
      metadata: {
        subscriptionId: "sub_123",
      },
    });
    mockGetSubscriptionStatus.mockResolvedValue(SubscriptionStatus.TRIALING);
    mockEndTrial.mockResolvedValue(true);
    mockGetSubscription.mockResolvedValue({
      cancel_at: null,
      cancel_at_period_end: false,
    });
  });

  it("ends the trial when no cancellation is scheduled", async () => {
    const result = await skipTrialForTeamHandler({
      // @ts-expect-error simplified test context
      ctx,
      input,
    });

    expect(result).toEqual({ success: true });
    expect(mockEndTrial).toHaveBeenCalled();
  });

  it("rejects skipping the trial when cancellation is already scheduled", async () => {
    mockGetSubscription.mockResolvedValueOnce({
      cancel_at: 1_777_777_777,
      cancel_at_period_end: true,
    });

    await expect(
      skipTrialForTeamHandler({
        // @ts-expect-error simplified test context
        ctx,
        input,
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Trial is already scheduled to end",
    });

    expect(mockEndTrial).not.toHaveBeenCalled();
  });
});
