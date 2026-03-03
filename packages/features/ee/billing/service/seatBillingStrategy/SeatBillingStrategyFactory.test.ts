import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveUserBillingService } from "../../active-user/services/ActiveUserBillingService";
import type { HighWaterMarkRepository } from "../../repository/highWaterMark/HighWaterMarkRepository";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { BillingPeriodService } from "../billingPeriod/BillingPeriodService";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import type { HighWaterMarkService } from "../highWaterMark/HighWaterMarkService";
import type { MonthlyProrationService } from "../proration/MonthlyProrationService";
import { ActiveUserBillingStrategy } from "./ActiveUserBillingStrategy";
import { HighWaterMarkStrategy } from "./HighWaterMarkStrategy";
import { ImmediateUpdateStrategy } from "./ImmediateUpdateStrategy";
import { MonthlyProrationStrategy } from "./MonthlyProrationStrategy";
import { SeatBillingStrategyFactory } from "./SeatBillingStrategyFactory";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

function createMockBillingPeriodService() {
  return {
    getBillingPeriodInfo: vi.fn(),
    updateBillingPeriod: vi.fn(),
    shouldApplyMonthlyProration: vi.fn(),
    shouldApplyHwmSeating: vi.fn(),
    getOrCreateBillingPeriodInfo: vi.fn(),
  } as unknown as BillingPeriodService;
}

function createMockFeaturesRepository(): {
  [K in keyof IFeaturesRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    checkIfFeatureIsEnabledGlobally: vi.fn(),
    checkIfUserHasFeature: vi.fn(),
    checkIfUserHasFeatureNonHierarchical: vi.fn(),
    checkIfTeamHasFeature: vi.fn(),
    getTeamsWithFeatureEnabled: vi.fn(),
    setUserFeatureState: vi.fn(),
    setTeamFeatureState: vi.fn(),
  };
}

const TEAM_ID = 42;

describe("SeatBillingStrategyFactory", () => {
  let factory: SeatBillingStrategyFactory;
  let mockBillingPeriodService: BillingPeriodService;
  let mockFeaturesRepo: ReturnType<typeof createMockFeaturesRepository>;
  let mockTeamBillingDataRepo: { findBySubscriptionId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBillingPeriodService = createMockBillingPeriodService();
    mockFeaturesRepo = createMockFeaturesRepository();
    mockTeamBillingDataRepo = {
      findBySubscriptionId: vi.fn(),
    };

    factory = new SeatBillingStrategyFactory({
      billingPeriodService: mockBillingPeriodService,
      featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
      billingProviderService: {} as IBillingProviderService,
      highWaterMarkRepository: {} as HighWaterMarkRepository,
      highWaterMarkService: {} as HighWaterMarkService,
      monthlyProrationService: {} as MonthlyProrationService,
      teamBillingDataRepository: mockTeamBillingDataRepo as unknown as ITeamBillingDataRepository,
      activeUserBillingService: {} as ActiveUserBillingService,
    });
  });

  function mockBillingPeriodInfo(overrides: Record<string, unknown> = {}) {
    vi.mocked(mockBillingPeriodService.getBillingPeriodInfo).mockResolvedValue({
      billingPeriod: "MONTHLY",
      billingMode: "SEATS",
      subscriptionStart: new Date("2026-01-01"),
      subscriptionEnd: new Date("2027-01-01"),
      trialEnd: null,
      isInTrial: false,
      pricePerSeat: 1500,
      isOrganization: false,
      ...overrides,
    });
  }

  describe("createByTeamId", () => {
    it("returns fallback strategy when team is in trial", async () => {
      mockBillingPeriodInfo({ isInTrial: true });
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const strategy = await factory.createByTeamId(TEAM_ID);

      expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
    });

    it("returns HWM strategy for monthly billing when hwm-seating flag is on", async () => {
      mockBillingPeriodInfo({ billingPeriod: "MONTHLY", isInTrial: false });
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockImplementation(async (name: string) => {
        return name === "hwm-seating";
      });

      const strategy = await factory.createByTeamId(TEAM_ID);

      expect(strategy).toBeInstanceOf(HighWaterMarkStrategy);
    });

    it("returns proration strategy for annual billing when monthly-proration flag is on", async () => {
      mockBillingPeriodInfo({ billingPeriod: "ANNUALLY", isInTrial: false });
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockImplementation(async (name: string) => {
        return name === "monthly-proration";
      });

      const strategy = await factory.createByTeamId(TEAM_ID);

      expect(strategy).toBeInstanceOf(MonthlyProrationStrategy);
    });

    it("returns active user strategy when active-user-billing flag is on", async () => {
      mockBillingPeriodInfo({ billingMode: "ACTIVE_USERS", isInTrial: false });
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockImplementation(async (name: string) => {
        return name === "active-user-billing";
      });

      const strategy = await factory.createByTeamId(TEAM_ID);

      expect(strategy).toBeInstanceOf(ActiveUserBillingStrategy);
    });
  });

  describe("createBySubscriptionId", () => {
    it("resolves team and delegates to createByTeamId", async () => {
      mockTeamBillingDataRepo.findBySubscriptionId.mockResolvedValue({ id: TEAM_ID });
      mockBillingPeriodInfo({ isInTrial: true });
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const strategy = await factory.createBySubscriptionId("sub_123");

      expect(mockTeamBillingDataRepo.findBySubscriptionId).toHaveBeenCalledWith("sub_123");
      expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
    });

    it("returns fallback when no team is found for subscription", async () => {
      mockTeamBillingDataRepo.findBySubscriptionId.mockResolvedValue(null);

      const strategy = await factory.createBySubscriptionId("sub_unknown");

      expect(strategy).toBeInstanceOf(ImmediateUpdateStrategy);
    });
  });
});
