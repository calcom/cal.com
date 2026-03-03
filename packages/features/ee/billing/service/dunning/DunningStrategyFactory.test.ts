import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { ISeatBillingStrategy } from "../seatBillingStrategy/ISeatBillingStrategy";
import type { SeatBillingStrategyFactory } from "../seatBillingStrategy/SeatBillingStrategyFactory";
import { DunningAwareStrategy } from "./DunningAwareStrategy";
import type { DunningServiceFactory as DunningServiceFactoryType } from "./DunningServiceFactory";
import type { IDunningService } from "./IDunningService";
import { DunningStrategyFactory } from "./DunningStrategyFactory";

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
const BILLING_ID = "billing_123";
const MOCK_INNER_STRATEGY = { onSeatChange: vi.fn() } as unknown as ISeatBillingStrategy;

function createMockDunningServiceFactory(resolved = true) {
  const mockService = {
    onPaymentFailed: vi.fn(),
    onPaymentSucceeded: vi.fn(),
    findRecord: vi.fn(),
    getStatus: vi.fn(),
    getBillingIdsToAdvance: vi.fn(),
    advanceDunning: vi.fn(),
  } as unknown as IDunningService;

  return {
    forTeam: vi.fn().mockResolvedValue(
      resolved
        ? { service: mockService, billingId: BILLING_ID, entityType: "team" as const }
        : null
    ),
    _mockService: mockService,
  };
}

describe("DunningStrategyFactory", () => {
  let dunningFactory: DunningStrategyFactory;
  let mockInnerFactory: {
    createByTeamId: ReturnType<typeof vi.fn>;
    createBySubscriptionId: ReturnType<typeof vi.fn>;
  };
  let mockFeaturesRepo: ReturnType<typeof createMockFeaturesRepository>;
  let mockDunningServiceFactory: ReturnType<typeof createMockDunningServiceFactory>;
  let mockTeamBillingDataRepo: { findBySubscriptionId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockInnerFactory = {
      createByTeamId: vi.fn().mockResolvedValue(MOCK_INNER_STRATEGY),
      createBySubscriptionId: vi.fn().mockResolvedValue(MOCK_INNER_STRATEGY),
    };
    mockFeaturesRepo = createMockFeaturesRepository();
    mockDunningServiceFactory = createMockDunningServiceFactory();
    mockTeamBillingDataRepo = {
      findBySubscriptionId: vi.fn(),
    };

    dunningFactory = new DunningStrategyFactory({
      inner: mockInnerFactory as unknown as SeatBillingStrategyFactory,
      dunningServiceFactory: mockDunningServiceFactory as unknown as DunningServiceFactoryType,
      featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
      teamBillingDataRepository: mockTeamBillingDataRepo as unknown as ITeamBillingDataRepository,
    });
  });

  describe("createByTeamId", () => {
    it("wraps with DunningAwareStrategy when dunning-enforcement flag is enabled", async () => {
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const strategy = await dunningFactory.createByTeamId(TEAM_ID, "sub_123");

      expect(mockInnerFactory.createByTeamId).toHaveBeenCalledWith(TEAM_ID);
      expect(strategy).toBeInstanceOf(DunningAwareStrategy);
    });

    it("returns inner strategy directly when dunning-enforcement flag is disabled", async () => {
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const strategy = await dunningFactory.createByTeamId(TEAM_ID);

      expect(mockInnerFactory.createByTeamId).toHaveBeenCalledWith(TEAM_ID);
      expect(strategy).toBe(MOCK_INNER_STRATEGY);
    });

    it("returns inner strategy when no billing record found", async () => {
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockDunningServiceFactory.forTeam.mockResolvedValue(null);

      const strategy = await dunningFactory.createByTeamId(TEAM_ID);

      expect(strategy).toBe(MOCK_INNER_STRATEGY);
    });

    it("passes empty string as subscriptionId when none is provided", async () => {
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const strategy = await dunningFactory.createByTeamId(TEAM_ID);

      expect(strategy).toBeInstanceOf(DunningAwareStrategy);
    });
  });

  describe("createBySubscriptionId", () => {
    it("resolves team and wraps with dunning when flag enabled", async () => {
      mockTeamBillingDataRepo.findBySubscriptionId.mockResolvedValue({ id: TEAM_ID });
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const strategy = await dunningFactory.createBySubscriptionId("sub_789");

      expect(mockTeamBillingDataRepo.findBySubscriptionId).toHaveBeenCalledWith("sub_789");
      expect(mockInnerFactory.createByTeamId).toHaveBeenCalledWith(TEAM_ID);
      expect(strategy).toBeInstanceOf(DunningAwareStrategy);
    });

    it("delegates to inner factory when no team is found for subscription", async () => {
      mockTeamBillingDataRepo.findBySubscriptionId.mockResolvedValue(null);

      const strategy = await dunningFactory.createBySubscriptionId("sub_unknown");

      expect(mockInnerFactory.createBySubscriptionId).toHaveBeenCalledWith("sub_unknown");
      expect(strategy).toBe(MOCK_INNER_STRATEGY);
    });

    it("returns unwrapped strategy when flag is disabled", async () => {
      mockTeamBillingDataRepo.findBySubscriptionId.mockResolvedValue({ id: TEAM_ID });
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const strategy = await dunningFactory.createBySubscriptionId("sub_456");

      expect(strategy).toBe(MOCK_INNER_STRATEGY);
    });
  });
});
