import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RawDunningRecord } from "../../repository/dunning/IDunningRepository";
import type { BlockableAction } from "./DunningState";
import { DunningState } from "./DunningState";
import { DEFAULT_DUNNING_POLICY, DunningGuard } from "./DunningGuard";
import type { DunningServiceFactory } from "./DunningServiceFactory";
import type { IDunningService } from "./IDunningService";

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

function createMockStrategyFactory(strategyName = "ImmediateUpdate"): {
  createByTeamId: ReturnType<typeof vi.fn>;
} {
  return {
    createByTeamId: vi.fn().mockResolvedValue({ strategyName }),
  };
}

function makeDunningState(
  overrides: Partial<{
    status: "CURRENT" | "WARNING" | "SOFT_BLOCKED" | "HARD_BLOCKED" | "CANCELLED";
    invoiceUrl: string | null;
  }> = {}
): DunningState {
  const raw: RawDunningRecord = {
    id: "dns_1",
    billingFk: "billing_123",
    status: overrides.status ?? "CURRENT",
    firstFailedAt: new Date("2026-02-10T00:00:00Z"),
    lastFailedAt: new Date("2026-02-15T00:00:00Z"),
    resolvedAt: null,
    subscriptionId: "sub_123",
    failedInvoiceId: "inv_456",
    invoiceUrl:
      "invoiceUrl" in overrides
        ? overrides.invoiceUrl!
        : "https://stripe.com/invoice/inv_456",
    failureReason: "card_declined",
    notificationsSent: 1,
    createdAt: new Date("2026-02-10T00:00:00Z"),
    updatedAt: new Date("2026-02-15T00:00:00Z"),
  };
  return DunningState.fromRecord(raw, "team");
}

function createMockDunningServiceFactory(
  findRecordResult: DunningState | null = null
) {
  const mockService = {
    findRecord: vi.fn().mockResolvedValue(findRecordResult),
    getStatus: vi.fn().mockResolvedValue(findRecordResult?.status ?? "CURRENT"),
  } as unknown as IDunningService;

  return {
    forTeam: vi.fn().mockResolvedValue(
      findRecordResult
        ? { service: mockService, billingId: "billing_123", entityType: "team" as const }
        : null
    ),
    _mockService: mockService,
  };
}

function createMockDunningServiceFactoryForSubTeam(
  parentTeamId: number,
  findRecordResult: DunningState | null = null
) {
  const mockService = {
    findRecord: vi.fn().mockResolvedValue(findRecordResult),
    getStatus: vi.fn().mockResolvedValue(findRecordResult?.status ?? "CURRENT"),
  } as unknown as IDunningService;

  return {
    forTeam: vi.fn().mockImplementation((teamId: number) => {
      if (teamId === parentTeamId && findRecordResult) {
        return Promise.resolve({
          service: mockService,
          billingId: "billing_parent",
          entityType: "organization" as const,
        });
      }
      return Promise.resolve(null);
    }),
    _mockService: mockService,
  };
}

describe("DunningGuard", () => {
  let guard: DunningGuard;
  let mockDunningServiceFactory: ReturnType<typeof createMockDunningServiceFactory>;
  let mockFeaturesRepo: ReturnType<typeof createMockFeaturesRepository>;
  let mockStrategyFactory: ReturnType<typeof createMockStrategyFactory>;
  let mockTeamRepository: { findTeamSlugById: ReturnType<typeof vi.fn> };
  const enterpriseSlugs = ["enterprise-team", "vip-org"];

  function setupGuard(
    findRecordResult: DunningState | null = null,
    strategyName = "ImmediateUpdate"
  ) {
    mockDunningServiceFactory = createMockDunningServiceFactory(findRecordResult);
    mockFeaturesRepo = createMockFeaturesRepository();
    mockStrategyFactory = createMockStrategyFactory(strategyName);
    mockTeamRepository = {
      findTeamSlugById: vi.fn().mockResolvedValue({ slug: "test-team", parentId: null }),
    };
    guard = new DunningGuard({
      dunningServiceFactory: mockDunningServiceFactory as unknown as DunningServiceFactory,
      featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
      enterpriseSlugs,
      seatBillingStrategyFactory: mockStrategyFactory,
      teamRepository: mockTeamRepository,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupGuard();
  });

  describe("feature flag disabled", () => {
    beforeEach(() => {
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);
    });

    it("allows any action when the dunning-enforcement flag is disabled", async () => {
      const actions: BlockableAction[] = [
        "INVITE_MEMBER",
        "CREATE_EVENT_TYPE",
        "CREATE_BOOKING",
        "API_ACCESS",
      ];

      for (const action of actions) {
        const result = await guard.canPerformAction(100, action);
        expect(result).toEqual({ allowed: true });
      }

      expect(mockDunningServiceFactory.forTeam).not.toHaveBeenCalled();
    });
  });

  describe("feature flag enabled", () => {
    beforeEach(() => {
      mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    });

    describe("no billing record", () => {
      beforeEach(() => {
        setupGuard(null);
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockDunningServiceFactory.forTeam.mockResolvedValue(null);
      });

      it("allows all actions when no billing record exists", async () => {
        const actions: BlockableAction[] = [
          "INVITE_MEMBER",
          "CREATE_EVENT_TYPE",
          "CREATE_BOOKING",
          "API_ACCESS",
        ];

        for (const action of actions) {
          const result = await guard.canPerformAction(100, action);
          expect(result).toEqual({ allowed: true });
        }
      });
    });

    describe("CURRENT status", () => {
      beforeEach(() => {
        setupGuard(makeDunningState({ status: "CURRENT" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      });

      it("allows all actions when status is CURRENT", async () => {
        const actions: BlockableAction[] = [
          "INVITE_MEMBER",
          "CREATE_EVENT_TYPE",
          "CREATE_BOOKING",
          "API_ACCESS",
        ];

        for (const action of actions) {
          const result = await guard.canPerformAction(100, action);
          expect(result).toEqual({ allowed: true });
        }
      });
    });

    describe("WARNING status", () => {
      beforeEach(() => {
        setupGuard(makeDunningState({ status: "WARNING" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      });

      it("allows all actions when status is WARNING", async () => {
        const actions: BlockableAction[] = [
          "INVITE_MEMBER",
          "CREATE_EVENT_TYPE",
          "CREATE_BOOKING",
          "API_ACCESS",
        ];

        for (const action of actions) {
          const result = await guard.canPerformAction(100, action);
          expect(result).toEqual({ allowed: true });
        }
      });
    });

    describe("SOFT_BLOCKED status (default policy)", () => {
      beforeEach(() => {
        setupGuard(makeDunningState({ status: "SOFT_BLOCKED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      });

      it("blocks INVITE_MEMBER when status is SOFT_BLOCKED", async () => {
        const result = await guard.canPerformAction(100, "INVITE_MEMBER");
        expect(result).toEqual({
          allowed: false,
          reason: "dunning_blocked_invite",
          dunningStatus: "SOFT_BLOCKED",
          invoiceUrl: "https://stripe.com/invoice/inv_456",
        });
      });

      it("blocks CREATE_EVENT_TYPE when status is SOFT_BLOCKED", async () => {
        const result = await guard.canPerformAction(100, "CREATE_EVENT_TYPE");
        expect(result).toEqual({
          allowed: false,
          reason: "dunning_blocked_event_type",
          dunningStatus: "SOFT_BLOCKED",
          invoiceUrl: "https://stripe.com/invoice/inv_456",
        });
      });

      it("allows CREATE_BOOKING when status is SOFT_BLOCKED", async () => {
        const result = await guard.canPerformAction(100, "CREATE_BOOKING");
        expect(result).toEqual({
          allowed: true,
          dunningStatus: "SOFT_BLOCKED",
        });
      });

      it("allows API_ACCESS when status is SOFT_BLOCKED", async () => {
        const result = await guard.canPerformAction(100, "API_ACCESS");
        expect(result).toEqual({
          allowed: true,
          dunningStatus: "SOFT_BLOCKED",
        });
      });
    });

    describe("HARD_BLOCKED status (default policy)", () => {
      beforeEach(() => {
        setupGuard(makeDunningState({ status: "HARD_BLOCKED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      });

      it("blocks INVITE_MEMBER when status is HARD_BLOCKED", async () => {
        const result = await guard.canPerformAction(100, "INVITE_MEMBER");
        expect(result).toEqual({
          allowed: false,
          reason: "dunning_blocked_invite",
          dunningStatus: "HARD_BLOCKED",
          invoiceUrl: "https://stripe.com/invoice/inv_456",
        });
      });

      it("blocks CREATE_BOOKING when status is HARD_BLOCKED", async () => {
        const result = await guard.canPerformAction(100, "CREATE_BOOKING");
        expect(result).toEqual({
          allowed: false,
          reason: "dunning_blocked_booking",
          dunningStatus: "HARD_BLOCKED",
          invoiceUrl: "https://stripe.com/invoice/inv_456",
        });
      });

      it("blocks API_ACCESS when status is HARD_BLOCKED", async () => {
        const result = await guard.canPerformAction(100, "API_ACCESS");
        expect(result).toEqual({
          allowed: false,
          reason: "dunning_blocked_api",
          dunningStatus: "HARD_BLOCKED",
          invoiceUrl: "https://stripe.com/invoice/inv_456",
        });
      });
    });

    describe("CANCELLED status (default policy)", () => {
      beforeEach(() => {
        setupGuard(makeDunningState({ status: "CANCELLED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      });

      it("blocks all actions when status is CANCELLED", async () => {
        const actions: BlockableAction[] = [
          "INVITE_MEMBER",
          "CREATE_EVENT_TYPE",
          "CREATE_BOOKING",
          "API_ACCESS",
        ];

        for (const action of actions) {
          const result = await guard.canPerformAction(100, action);
          expect(result.allowed).toBe(false);
        }
      });
    });

    describe("strategy-specific policy (MonthlyProration - lenient)", () => {
      it("allows CREATE_EVENT_TYPE at SOFT_BLOCKED with MonthlyProration strategy", async () => {
        setupGuard(makeDunningState({ status: "SOFT_BLOCKED" }), "MonthlyProration");
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

        const result = await guard.canPerformAction(100, "CREATE_EVENT_TYPE");
        expect(result).toEqual({
          allowed: true,
          dunningStatus: "SOFT_BLOCKED",
        });
      });

      it("blocks INVITE_MEMBER at SOFT_BLOCKED with MonthlyProration strategy", async () => {
        setupGuard(makeDunningState({ status: "SOFT_BLOCKED" }), "MonthlyProration");
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

        const result = await guard.canPerformAction(100, "INVITE_MEMBER");
        expect(result.allowed).toBe(false);
      });

      it("allows CREATE_BOOKING at HARD_BLOCKED with MonthlyProration strategy", async () => {
        setupGuard(makeDunningState({ status: "HARD_BLOCKED" }), "MonthlyProration");
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

        const result = await guard.canPerformAction(100, "CREATE_BOOKING");
        expect(result).toEqual({
          allowed: true,
          dunningStatus: "HARD_BLOCKED",
        });
      });

      it("blocks all actions at CANCELLED even with MonthlyProration strategy", async () => {
        setupGuard(makeDunningState({ status: "CANCELLED" }), "MonthlyProration");
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

        const actions: BlockableAction[] = [
          "INVITE_MEMBER",
          "CREATE_EVENT_TYPE",
          "CREATE_BOOKING",
          "API_ACCESS",
        ];

        for (const action of actions) {
          const result = await guard.canPerformAction(100, action);
          expect(result.allowed).toBe(false);
        }
      });
    });

    describe("strategy factory failure falls back to default policy", () => {
      it("uses default aggressive policy when factory throws", async () => {
        setupGuard(makeDunningState({ status: "SOFT_BLOCKED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockStrategyFactory = createMockStrategyFactory();
        mockStrategyFactory.createByTeamId.mockRejectedValue(new Error("factory error"));
        guard = new DunningGuard({
          dunningServiceFactory: mockDunningServiceFactory as unknown as DunningServiceFactory,
          featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
          enterpriseSlugs,
          seatBillingStrategyFactory: mockStrategyFactory,
          teamRepository: mockTeamRepository,
        });

        const result = await guard.canPerformAction(100, "CREATE_EVENT_TYPE");
        expect(result.allowed).toBe(false);
      });
    });

    describe("enterprise exemption", () => {
      it("allows all actions for enterprise-exempted teams even when SOFT_BLOCKED", async () => {
        setupGuard(makeDunningState({ status: "SOFT_BLOCKED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockTeamRepository.findTeamSlugById.mockResolvedValue({ slug: "enterprise-team" });

        const actions: BlockableAction[] = [
          "INVITE_MEMBER",
          "CREATE_EVENT_TYPE",
          "CREATE_BOOKING",
          "API_ACCESS",
        ];

        for (const action of actions) {
          const result = await guard.canPerformAction(100, action);
          expect(result).toEqual({ allowed: true });
        }
      });

      it("allows all actions for enterprise-exempted teams even when HARD_BLOCKED", async () => {
        setupGuard(makeDunningState({ status: "HARD_BLOCKED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockTeamRepository.findTeamSlugById.mockResolvedValue({ slug: "vip-org" });

        const actions: BlockableAction[] = [
          "INVITE_MEMBER",
          "CREATE_EVENT_TYPE",
          "CREATE_BOOKING",
          "API_ACCESS",
        ];

        for (const action of actions) {
          const result = await guard.canPerformAction(100, action);
          expect(result).toEqual({ allowed: true });
        }
      });

      it("does not exempt teams whose slug is not in the enterprise list", async () => {
        setupGuard(makeDunningState({ status: "HARD_BLOCKED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockTeamRepository.findTeamSlugById.mockResolvedValue({ slug: "regular-team" });

        const result = await guard.canPerformAction(100, "INVITE_MEMBER");
        expect(result.allowed).toBe(false);
      });
    });

    describe("null invoiceUrl", () => {
      it("includes null invoiceUrl in blocked result when invoice URL is not available", async () => {
        setupGuard(makeDunningState({ status: "HARD_BLOCKED", invoiceUrl: null }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

        const result = await guard.canPerformAction(100, "CREATE_BOOKING");
        expect(result).toEqual({
          allowed: false,
          reason: "dunning_blocked_booking",
          dunningStatus: "HARD_BLOCKED",
          invoiceUrl: null,
        });
      });
    });

    describe("null team slug", () => {
      it("does not exempt teams with null slug", async () => {
        setupGuard(makeDunningState({ status: "HARD_BLOCKED" }));
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockTeamRepository.findTeamSlugById.mockResolvedValue(null);

        const result = await guard.canPerformAction(100, "API_ACCESS");
        expect(result.allowed).toBe(false);
      });
    });

    describe("sub-team inherits parent org dunning", () => {
      const PARENT_ORG_ID = 100;
      const SUB_TEAM_ID = 200;

      it("blocks CREATE_EVENT_TYPE on sub-team when parent org is SOFT_BLOCKED", async () => {
        const mockFactory = createMockDunningServiceFactoryForSubTeam(
          PARENT_ORG_ID,
          makeDunningState({ status: "SOFT_BLOCKED" })
        );
        mockFeaturesRepo = createMockFeaturesRepository();
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockStrategyFactory = createMockStrategyFactory();
        mockTeamRepository = {
          findTeamSlugById: vi.fn().mockImplementation(({ id }: { id: number }) => {
            if (id === SUB_TEAM_ID)
              return Promise.resolve({ slug: "sub-team", parentId: PARENT_ORG_ID });
            if (id === PARENT_ORG_ID) return Promise.resolve({ slug: "parent-org", parentId: null });
            return Promise.resolve(null);
          }),
        };

        guard = new DunningGuard({
          dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
          featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
          enterpriseSlugs,
          seatBillingStrategyFactory: mockStrategyFactory,
          teamRepository: mockTeamRepository,
        });

        const result = await guard.canPerformAction(SUB_TEAM_ID, "CREATE_EVENT_TYPE");
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("dunning_blocked_event_type");
        expect(result.dunningStatus).toBe("SOFT_BLOCKED");
      });

      it("blocks INVITE_MEMBER on sub-team when parent org is HARD_BLOCKED", async () => {
        const mockFactory = createMockDunningServiceFactoryForSubTeam(
          PARENT_ORG_ID,
          makeDunningState({ status: "HARD_BLOCKED" })
        );
        mockFeaturesRepo = createMockFeaturesRepository();
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockStrategyFactory = createMockStrategyFactory();
        mockTeamRepository = {
          findTeamSlugById: vi.fn().mockImplementation(({ id }: { id: number }) => {
            if (id === SUB_TEAM_ID)
              return Promise.resolve({ slug: "sub-team", parentId: PARENT_ORG_ID });
            if (id === PARENT_ORG_ID) return Promise.resolve({ slug: "parent-org", parentId: null });
            return Promise.resolve(null);
          }),
        };

        guard = new DunningGuard({
          dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
          featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
          enterpriseSlugs,
          seatBillingStrategyFactory: mockStrategyFactory,
          teamRepository: mockTeamRepository,
        });

        const result = await guard.canPerformAction(SUB_TEAM_ID, "INVITE_MEMBER");
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("dunning_blocked_invite");
      });

      it("allows action on sub-team when parent org has no dunning issues", async () => {
        const mockFactory = createMockDunningServiceFactoryForSubTeam(PARENT_ORG_ID, null);
        mockFeaturesRepo = createMockFeaturesRepository();
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockStrategyFactory = createMockStrategyFactory();
        mockTeamRepository = {
          findTeamSlugById: vi.fn().mockImplementation(({ id }: { id: number }) => {
            if (id === SUB_TEAM_ID)
              return Promise.resolve({ slug: "sub-team", parentId: PARENT_ORG_ID });
            if (id === PARENT_ORG_ID) return Promise.resolve({ slug: "parent-org", parentId: null });
            return Promise.resolve(null);
          }),
        };

        guard = new DunningGuard({
          dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
          featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
          enterpriseSlugs,
          seatBillingStrategyFactory: mockStrategyFactory,
          teamRepository: mockTeamRepository,
        });

        const result = await guard.canPerformAction(SUB_TEAM_ID, "CREATE_EVENT_TYPE");
        expect(result).toEqual({ allowed: true });
      });

      it("exempts sub-team when parent org slug is in enterprise list", async () => {
        const mockFactory = createMockDunningServiceFactoryForSubTeam(
          PARENT_ORG_ID,
          makeDunningState({ status: "HARD_BLOCKED" })
        );
        mockFeaturesRepo = createMockFeaturesRepository();
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockStrategyFactory = createMockStrategyFactory();
        mockTeamRepository = {
          findTeamSlugById: vi.fn().mockImplementation(({ id }: { id: number }) => {
            if (id === SUB_TEAM_ID)
              return Promise.resolve({ slug: "sub-team", parentId: PARENT_ORG_ID });
            if (id === PARENT_ORG_ID)
              return Promise.resolve({ slug: "enterprise-team", parentId: null });
            return Promise.resolve(null);
          }),
        };

        guard = new DunningGuard({
          dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
          featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
          enterpriseSlugs,
          seatBillingStrategyFactory: mockStrategyFactory,
          teamRepository: mockTeamRepository,
        });

        const result = await guard.canPerformAction(SUB_TEAM_ID, "CREATE_EVENT_TYPE");
        expect(result).toEqual({ allowed: true });
      });

      it("resolves policy using parent org ID for sub-teams", async () => {
        const mockFactory = createMockDunningServiceFactoryForSubTeam(
          PARENT_ORG_ID,
          makeDunningState({ status: "SOFT_BLOCKED" })
        );
        mockFeaturesRepo = createMockFeaturesRepository();
        mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
        mockStrategyFactory = createMockStrategyFactory("MonthlyProration");
        mockTeamRepository = {
          findTeamSlugById: vi.fn().mockImplementation(({ id }: { id: number }) => {
            if (id === SUB_TEAM_ID)
              return Promise.resolve({ slug: "sub-team", parentId: PARENT_ORG_ID });
            if (id === PARENT_ORG_ID) return Promise.resolve({ slug: "parent-org", parentId: null });
            return Promise.resolve(null);
          }),
        };

        guard = new DunningGuard({
          dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
          featuresRepository: mockFeaturesRepo as unknown as IFeaturesRepository,
          enterpriseSlugs,
          seatBillingStrategyFactory: mockStrategyFactory,
          teamRepository: mockTeamRepository,
        });

        const result = await guard.canPerformAction(SUB_TEAM_ID, "CREATE_EVENT_TYPE");
        expect(result).toEqual({
          allowed: true,
          dunningStatus: "SOFT_BLOCKED",
        });

        const inviteResult = await guard.canPerformAction(SUB_TEAM_ID, "INVITE_MEMBER");
        expect(inviteResult.allowed).toBe(false);
      });
    });
  });
});
