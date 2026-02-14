import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import { describe, expect, it, vi } from "vitest";
import type { ITeamBillingDataRepository } from "../../../repository/teamBillingData/ITeamBillingDataRepository";
import type { BillingPeriodInfo } from "../../billingPeriod/BillingPeriodService";
import type { IBillingProviderService } from "../../billingProvider/IBillingProviderService";
import { ActiveUserBillingStrategy } from "../ActiveUserBillingStrategy";
import { HighWaterMarkStrategy } from "../HighWaterMarkStrategy";
import { ImmediateUpdateStrategy } from "../ImmediateUpdateStrategy";
import { MonthlyProrationStrategy } from "../MonthlyProrationStrategy";
import { SeatBillingStrategyFactory } from "../SeatBillingStrategyFactory";

function createMockBillingPeriodService(info: BillingPeriodInfo) {
  return { getBillingPeriodInfo: vi.fn().mockResolvedValue(info) };
}

function createMockFeaturesRepository(
  enabledFlags: Record<string, boolean>
): IFeaturesRepository {
  return {
    checkIfFeatureIsEnabledGlobally: vi.fn(
      async (slug: string) => enabledFlags[slug] ?? false
    ),
  } as unknown as IFeaturesRepository;
}

function createMockBillingProviderService(): IBillingProviderService {
  return {
    handleSubscriptionUpdate: vi.fn(),
  } as unknown as IBillingProviderService;
}

function createMockHighWaterMarkRepository() {
  return {
    getByTeamId: vi.fn(),
    updateIfHigher: vi
      .fn()
      .mockResolvedValue({ updated: false, previousHighWaterMark: null }),
  };
}

function createMockHighWaterMarkService() {
  return {
    applyHighWaterMarkToSubscription: vi.fn().mockResolvedValue(false),
    resetSubscriptionAfterRenewal: vi.fn().mockResolvedValue(false),
  };
}

function createMockMonthlyProrationService() {
  return {
    handleProrationPaymentSuccess: vi.fn(),
    handleProrationPaymentFailure: vi.fn(),
  };
}

function createMockActiveUserBillingService() {
  return {
    getActiveUserCountForOrg: vi.fn().mockResolvedValue(0),
    getActiveUserCountForPlatformOrg: vi.fn().mockResolvedValue(0),
  };
}

function createMockTeamBillingDataRepository(): ITeamBillingDataRepository {
  return {
    find: vi.fn(),
    findBySubscriptionId: vi.fn().mockResolvedValue(null),
    findMany: vi.fn(),
  };
}

const baseBillingInfo: BillingPeriodInfo = {
  billingPeriod: null,
  billingMode: "SEATS",
  subscriptionStart: new Date("2025-01-01"),
  subscriptionEnd: new Date("2026-01-01"),
  trialEnd: null,
  isInTrial: false,
  pricePerSeat: 1500,
  isOrganization: false,
};

function createFactory(
  info: BillingPeriodInfo,
  enabledFlags: Record<string, boolean>,
  overrides?: { teamBillingDataRepository?: ITeamBillingDataRepository }
): SeatBillingStrategyFactory {
  return new SeatBillingStrategyFactory({
    billingPeriodService: createMockBillingPeriodService(info),
    featuresRepository: createMockFeaturesRepository(enabledFlags),
    billingProviderService: createMockBillingProviderService(),
    highWaterMarkRepository: createMockHighWaterMarkRepository(),
    highWaterMarkService: createMockHighWaterMarkService(),
    monthlyProrationService: createMockMonthlyProrationService(),
    teamBillingDataRepository:
      overrides?.teamBillingDataRepository ??
      createMockTeamBillingDataRepository(),
    activeUserBillingService: createMockActiveUserBillingService(),
  } as never);
}

describe("SeatBillingStrategyFactory", () => {
  it("returns MonthlyProrationStrategy for annual plan with proration enabled", async () => {
    const billingPeriodService = createMockBillingPeriodService({
      ...baseBillingInfo,
      billingPeriod: "ANNUALLY",
    });
    const factory = new SeatBillingStrategyFactory({
      billingPeriodService,
      featuresRepository: createMockFeaturesRepository({
        "monthly-proration": true,
      }),
      billingProviderService: createMockBillingProviderService(),
      highWaterMarkRepository: createMockHighWaterMarkRepository(),
      highWaterMarkService: createMockHighWaterMarkService(),
      monthlyProrationService: createMockMonthlyProrationService(),
      teamBillingDataRepository: createMockTeamBillingDataRepository(),
      activeUserBillingService: createMockActiveUserBillingService(),
    } as never);
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(MonthlyProrationStrategy);
    expect(billingPeriodService.getBillingPeriodInfo).toHaveBeenCalledWith(1);
  });

  it("returns HighWaterMarkStrategy for monthly plan with HWM enabled", async () => {
    const factory = createFactory({ ...baseBillingInfo, billingPeriod: "MONTHLY" }, { "hwm-seating": true });
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(HighWaterMarkStrategy);
  });

  it("returns ImmediateUpdateStrategy for annual plan with proration disabled", async () => {
    const factory = createFactory(
      { ...baseBillingInfo, billingPeriod: "ANNUALLY" },
      { "monthly-proration": false }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });

  it("returns ImmediateUpdateStrategy for monthly plan with HWM disabled", async () => {
    const factory = createFactory({ ...baseBillingInfo, billingPeriod: "MONTHLY" }, { "hwm-seating": false });
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });

  it("returns ImmediateUpdateStrategy when team is in trial", async () => {
    const factory = createFactory(
      {
        ...baseBillingInfo,
        billingPeriod: "ANNUALLY",
        isInTrial: true,
        trialEnd: new Date("2026-06-01"),
      },
      { "monthly-proration": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });

  it("returns ImmediateUpdateStrategy when subscriptionStart is null", async () => {
    const factory = createFactory(
      {
        ...baseBillingInfo,
        billingPeriod: "ANNUALLY",
        subscriptionStart: null,
      },
      { "monthly-proration": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });

  it("returns ImmediateUpdateStrategy when billingPeriod is null", async () => {
    const factory = createFactory(
      { ...baseBillingInfo, billingPeriod: null },
      { "monthly-proration": true, "hwm-seating": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });

  it("createBySubscriptionId looks up team and delegates to create", async () => {
    const teamBillingDataRepo = createMockTeamBillingDataRepository();
    vi.mocked(teamBillingDataRepo.findBySubscriptionId).mockResolvedValue({
      id: 42,
      metadata: {},
      isOrganization: false,
      parentId: null,
      name: "Test Team",
    });

    const factory = createFactory(
      { ...baseBillingInfo, billingPeriod: "MONTHLY" },
      { "hwm-seating": true },
      { teamBillingDataRepository: teamBillingDataRepo }
    );
    const strategy = await factory.createBySubscriptionId("sub_abc");

    expect(teamBillingDataRepo.findBySubscriptionId).toHaveBeenCalledWith(
      "sub_abc"
    );
    expect(strategy).toBeInstanceOf(HighWaterMarkStrategy);
  });

  it("createBySubscriptionId returns fallback when no team found", async () => {
    const teamBillingDataRepo = createMockTeamBillingDataRepository();
    vi.mocked(teamBillingDataRepo.findBySubscriptionId).mockResolvedValue(null);

    const factory = createFactory(
      baseBillingInfo,
      {},
      { teamBillingDataRepository: teamBillingDataRepo }
    );
    const strategy = await factory.createBySubscriptionId("sub_unknown");

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });

  it("returns ActiveUserBillingStrategy when billingMode=ACTIVE_USERS and feature flag enabled", async () => {
    const factory = createFactory(
      {
        ...baseBillingInfo,
        billingPeriod: "MONTHLY",
        billingMode: "ACTIVE_USERS",
      },
      { "active-user-billing": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ActiveUserBillingStrategy);
  });

  it("returns fallback when billingMode=ACTIVE_USERS but feature flag disabled", async () => {
    const factory = createFactory(
      {
        ...baseBillingInfo,
        billingPeriod: "MONTHLY",
        billingMode: "ACTIVE_USERS",
      },
      { "active-user-billing": false }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });

  it("returns fallback when billingMode=SEATS even with active-user-billing flag enabled", async () => {
    const factory = createFactory(
      { ...baseBillingInfo, billingPeriod: "MONTHLY", billingMode: "SEATS" },
      { "active-user-billing": true, "hwm-seating": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(HighWaterMarkStrategy);
  });

  it("returns ActiveUserBillingStrategy for MONTHLY billing with billingMode=ACTIVE_USERS", async () => {
    const factory = createFactory(
      {
        ...baseBillingInfo,
        billingPeriod: "MONTHLY",
        billingMode: "ACTIVE_USERS",
      },
      { "active-user-billing": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ActiveUserBillingStrategy);
  });

  it("returns ActiveUserBillingStrategy for ANNUALLY billing with billingMode=ACTIVE_USERS", async () => {
    const factory = createFactory(
      {
        ...baseBillingInfo,
        billingPeriod: "ANNUALLY",
        billingMode: "ACTIVE_USERS",
      },
      { "active-user-billing": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ActiveUserBillingStrategy);
  });

  it("returns fallback when in trial even with billingMode=ACTIVE_USERS", async () => {
    const factory = createFactory(
      {
        ...baseBillingInfo,
        billingPeriod: "MONTHLY",
        billingMode: "ACTIVE_USERS",
        isInTrial: true,
        trialEnd: new Date("2026-06-01"),
      },
      { "active-user-billing": true }
    );
    const strategy = await factory.createByTeamId(1);

    expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
  });
});
