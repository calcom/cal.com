import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSubscriptionStatusHandler } from "./getSubscriptionStatus.handler";

const {
  mockFindUniqueByUserIdAndTeamId,
  mockCheckPermission,
  mockGetBillingPeriodInfo,
  mockFetchTeamOrThrow,
  mockFindAndInit,
  mockGetSubscription,
  MockMembershipRepository,
  MockPermissionCheckService,
  MockBillingPeriodService,
} = vi.hoisted(() => {
  const mockFindUniqueByUserIdAndTeamId = vi.fn();
  const mockCheckPermission = vi.fn();
  const mockGetBillingPeriodInfo = vi.fn();
  const mockFetchTeamOrThrow = vi.fn();
  const mockFindAndInit = vi.fn();
  const mockGetSubscription = vi.fn();

  class MockMembershipRepository {
    findUniqueByUserIdAndTeamId = mockFindUniqueByUserIdAndTeamId;
  }

  class MockPermissionCheckService {
    checkPermission = mockCheckPermission;
  }

  class MockBillingPeriodService {
    getBillingPeriodInfo = mockGetBillingPeriodInfo;
  }

  return {
    mockFindUniqueByUserIdAndTeamId,
    mockCheckPermission,
    mockGetBillingPeriodInfo,
    mockFetchTeamOrThrow,
    mockFindAndInit,
    mockGetSubscription,
    MockMembershipRepository,
    MockPermissionCheckService,
    MockBillingPeriodService,
  };
});

vi.mock("@calcom/lib/constants", () => ({
  IS_TEAM_BILLING_ENABLED: true,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: MockMembershipRepository,
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: MockPermissionCheckService,
}));

vi.mock("@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService", () => ({
  BillingPeriodService: MockBillingPeriodService,
}));

vi.mock("@calcom/features/ee/teams/services/teamService", () => ({
  TeamService: {
    fetchTeamOrThrow: mockFetchTeamOrThrow,
  },
}));

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getTeamBillingServiceFactory: vi.fn(() => ({
    findAndInit: mockFindAndInit,
  })),
  getBillingProviderService: vi.fn(() => ({
    getSubscription: mockGetSubscription,
  })),
}));

describe("getSubscriptionStatusHandler", () => {
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

    mockFetchTeamOrThrow.mockResolvedValue({
      id: 42,
      isOrganization: false,
      metadata: {
        subscriptionId: "sub_123",
      },
    });

    mockCheckPermission.mockResolvedValue(true);
    mockFindAndInit.mockResolvedValue({
      getSubscriptionStatus: vi.fn().mockResolvedValue(SubscriptionStatus.TRIALING),
    });
    mockGetBillingPeriodInfo.mockResolvedValue({
      billingMode: "ACTIVE_USERS",
    });
    mockGetSubscription.mockResolvedValue({
      cancel_at: null,
      cancel_at_period_end: false,
    });
  });

  it("returns isCancellationScheduled false when the subscription has no scheduled cancellation", async () => {
    const result = await getSubscriptionStatusHandler({
      // @ts-expect-error simplified test context
      ctx,
      input,
    });

    expect(result).toEqual({
      status: SubscriptionStatus.TRIALING,
      isTrialing: true,
      isCancellationScheduled: false,
      billingMode: "ACTIVE_USERS",
    });
  });

  it("returns isCancellationScheduled true when Stripe marks the subscription to cancel at period end", async () => {
    mockGetSubscription.mockResolvedValueOnce({
      cancel_at: 1_777_777_777,
      cancel_at_period_end: true,
    });

    const result = await getSubscriptionStatusHandler({
      // @ts-expect-error simplified test context
      ctx,
      input,
    });

    expect(result.isCancellationScheduled).toBe(true);
  });
});
