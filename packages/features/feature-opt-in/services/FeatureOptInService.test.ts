import type { IFeatureRepository } from "@calcom/features/flags/repositories/FeatureRepository";
import type { ITeamFeatureRepository } from "@calcom/features/flags/repositories/TeamFeatureRepository";
import type { IUserFeatureRepository } from "@calcom/features/flags/repositories/UserFeatureRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { TeamFeatures, UserFeatures } from "@calcom/prisma/client";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IFeatureOptInServiceDeps } from "./FeatureOptInService";
import { FeatureOptInService } from "./FeatureOptInService";

const mockIsFeatureAllowedForScope: Mock = vi.fn();
const mockFindAllByUserId: Mock = vi.fn();

// Mock the OPT_IN_FEATURES config
vi.mock("../config", () => {
  const mockFeatures = [
    {
      slug: "test-feature-1",
      i18n: { title: "test_feature_1_title", name: "test_feature_1", description: "test_feature_1_desc" },
      policy: "permissive",
    },
    {
      slug: "test-feature-2",
      i18n: { title: "test_feature_2_title", name: "test_feature_2", description: "test_feature_2_desc" },
      policy: "permissive",
    },
    {
      slug: "org-only-feature",
      i18n: { title: "org_only_title", name: "org_only", description: "org_only_desc" },
      policy: "permissive",
      scope: ["org"],
    },
    {
      slug: "team-only-feature",
      i18n: { title: "team_only_title", name: "team_only", description: "team_only_desc" },
      policy: "permissive",
      scope: ["team"],
    },
    {
      slug: "user-only-feature",
      i18n: { title: "user_only_title", name: "user_only", description: "user_only_desc" },
      policy: "permissive",
      scope: ["user"],
    },
    {
      slug: "strict-feature",
      i18n: { title: "strict_feature_title", name: "strict_feature", description: "strict_feature_desc" },
      policy: "strict",
    },
  ];
  return {
    OPT_IN_FEATURES: mockFeatures,
    isOptInFeature: (slug: string) => mockFeatures.some((feature) => feature.slug === slug),
    getOptInFeaturesForScope: () => mockFeatures,
    get isFeatureAllowedForScope(): Mock {
      return mockIsFeatureAllowedForScope;
    },
    getOptInFeatureConfig: (slug: string) => mockFeatures.find((feature) => feature.slug === slug),
  };
});

// Mock MembershipRepository
vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: class {
    findAllByUserId(...args: unknown[]): unknown {
      return mockFindAllByUserId(...args);
    }
  },
}));

// Mock PermissionCheckService - needs to be a class that can be instantiated
let mockCheckPermission: Mock = vi.fn();
vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: class {
    checkPermission(...args: unknown[]): unknown {
      return mockCheckPermission(...args);
    }
  },
}));

// Mock TeamRepository - needs to be a class that can be instantiated
let mockFindOwnedTeamsByUserId: Mock = vi.fn();
vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => ({
  TeamRepository: class {
    findOwnedTeamsByUserId(...args: unknown[]): unknown {
      return mockFindOwnedTeamsByUserId(...args);
    }
  },
}));

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

// Helper to create mock TeamFeatures
function createMockTeamFeature(teamId: number, featureId: string, enabled: boolean): TeamFeatures {
  return {
    teamId,
    featureId,
    enabled,
    assignedBy: "test",
    updatedAt: new Date(),
  };
}

// Helper to create mock UserFeatures
function createMockUserFeature(userId: number, featureId: string, enabled: boolean): UserFeatures {
  return {
    userId,
    featureId,
    enabled,
    assignedBy: "test",
    updatedAt: new Date(),
  };
}

describe("FeatureOptInService", () => {
  let mockFeatureRepo: {
    findAll: ReturnType<typeof vi.fn>;
  };
  let mockTeamFeatureRepo: {
    findByTeamIdAndFeatureId: ReturnType<typeof vi.fn>;
    findByTeamIdsAndFeatureIds: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findAutoOptInByTeamId: ReturnType<typeof vi.fn>;
    findAutoOptInByTeamIds: ReturnType<typeof vi.fn>;
    setAutoOptIn: ReturnType<typeof vi.fn>;
  };
  let mockUserFeatureRepo: {
    findByUserIdAndFeatureId: ReturnType<typeof vi.fn>;
    findByUserIdAndFeatureIds: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findAutoOptInByUserId: ReturnType<typeof vi.fn>;
    setAutoOptIn: ReturnType<typeof vi.fn>;
  };
  let mockDeps: IFeatureOptInServiceDeps;
  let service: FeatureOptInService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockIsFeatureAllowedForScope.mockReturnValue(true);

    mockFeatureRepo = {
      findAll: vi.fn(),
    };
    mockTeamFeatureRepo = {
      findByTeamIdAndFeatureId: vi.fn(),
      findByTeamIdsAndFeatureIds: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      findAutoOptInByTeamId: vi.fn(),
      findAutoOptInByTeamIds: vi.fn(),
      setAutoOptIn: vi.fn(),
    };
    mockUserFeatureRepo = {
      findByUserIdAndFeatureId: vi.fn(),
      findByUserIdAndFeatureIds: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      findAutoOptInByUserId: vi.fn(),
      setAutoOptIn: vi.fn(),
    };

    mockDeps = {
      featureRepo: mockFeatureRepo as unknown as IFeatureRepository,
      teamFeatureRepo: mockTeamFeatureRepo as unknown as ITeamFeatureRepository,
      userFeatureRepo: mockUserFeatureRepo as unknown as IUserFeatureRepository,
    };

    service = new FeatureOptInService(mockDeps);
  });

  describe("listFeaturesForTeam", () => {
    it("should return features with team state when no parent org", async () => {
      mockFeatureRepo.findAll.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
        { slug: "test-feature-2", enabled: true },
      ]);

      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({
        "test-feature-1": { 1: createMockTeamFeature(1, "test-feature-1", true) },
        "test-feature-2": { 1: createMockTeamFeature(1, "test-feature-2", false) },
      });

      const result = await service.listFeaturesForTeam({ teamId: 1 });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        featureId: "test-feature-1",
        globalEnabled: true,
        teamState: "enabled",
        orgState: "inherit",
      });
      expect(result[1]).toEqual({
        featureId: "test-feature-2",
        globalEnabled: true,
        teamState: "disabled",
        orgState: "inherit",
      });

      // Verify that only the team ID was queried (no parent org)
      expect(mockTeamFeatureRepo.findByTeamIdsAndFeatureIds).toHaveBeenCalledWith(
        [1],
        [
          "test-feature-1",
          "test-feature-2",
          "org-only-feature",
          "team-only-feature",
          "user-only-feature",
          "strict-feature",
        ]
      );
    });

    it("should return features with team and org state when parent org exists", async () => {
      mockFeatureRepo.findAll.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
        { slug: "test-feature-2", enabled: true },
      ]);

      // Team ID is 1, Parent Org ID is 100
      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({
        "test-feature-1": {
          1: createMockTeamFeature(1, "test-feature-1", true),
          100: createMockTeamFeature(100, "test-feature-1", false),
        },
        "test-feature-2": {
          100: createMockTeamFeature(100, "test-feature-2", true),
        },
      });

      const result = await service.listFeaturesForTeam({ teamId: 1, parentOrgId: 100 });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        featureId: "test-feature-1",
        globalEnabled: true,
        teamState: "enabled",
        orgState: "disabled",
      });
      expect(result[1]).toEqual({
        featureId: "test-feature-2",
        globalEnabled: true,
        teamState: "inherit",
        orgState: "enabled",
      });

      // Verify that both team ID and parent org ID were queried
      expect(mockTeamFeatureRepo.findByTeamIdsAndFeatureIds).toHaveBeenCalledWith(
        [1, 100],
        [
          "test-feature-1",
          "test-feature-2",
          "org-only-feature",
          "team-only-feature",
          "user-only-feature",
          "strict-feature",
        ]
      );
    });

    it("should return inherit for org state when parent org has no explicit state", async () => {
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: true }]);

      // Team ID is 1, Parent Org ID is 100, but org has no explicit state
      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({
        "test-feature-1": { 1: createMockTeamFeature(1, "test-feature-1", true) },
      });

      const result = await service.listFeaturesForTeam({ teamId: 1, parentOrgId: 100 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        featureId: "test-feature-1",
        globalEnabled: true,
        teamState: "enabled",
        orgState: "inherit",
      });
    });

    it("should filter out globally disabled features", async () => {
      mockFeatureRepo.findAll.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
        { slug: "test-feature-2", enabled: false },
      ]);

      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({
        "test-feature-1": { 1: createMockTeamFeature(1, "test-feature-1", true) },
        "test-feature-2": { 1: createMockTeamFeature(1, "test-feature-2", true) },
      });

      const result = await service.listFeaturesForTeam({ teamId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].featureId).toBe("test-feature-1");
    });

    it("should return inherit for team state when team has no explicit state", async () => {
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: true }]);

      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({
        "test-feature-1": {},
      });

      const result = await service.listFeaturesForTeam({ teamId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        featureId: "test-feature-1",
        globalEnabled: true,
        teamState: "inherit",
        orgState: "inherit",
      });
    });

    it("should handle null parentOrgId the same as undefined", async () => {
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: true }]);

      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({
        "test-feature-1": { 1: createMockTeamFeature(1, "test-feature-1", true) },
      });

      const result = await service.listFeaturesForTeam({ teamId: 1, parentOrgId: null });

      expect(result).toHaveLength(1);
      expect(result[0].orgState).toBe("inherit");

      // Verify that only the team ID was queried (no parent org)
      expect(mockTeamFeatureRepo.findByTeamIdsAndFeatureIds).toHaveBeenCalledWith(
        [1],
        [
          "test-feature-1",
          "test-feature-2",
          "org-only-feature",
          "team-only-feature",
          "user-only-feature",
          "strict-feature",
        ]
      );
    });
  });

  describe("setUserFeatureState", () => {
    it("should set user feature state when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockUserFeatureRepo.upsert.mockResolvedValue(createMockUserFeature(1, "test-feature-1", true));

      await service.setUserFeatureState({
        userId: 1,
        featureId: "test-feature-1",
        state: "enabled",
        assignedBy: 2,
      });

      expect(mockUserFeatureRepo.upsert).toHaveBeenCalledWith(1, "test-feature-1", true, "user-2");
    });

    it("should set user feature state to inherit when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockUserFeatureRepo.delete.mockResolvedValue(undefined);

      await service.setUserFeatureState({
        userId: 1,
        featureId: "test-feature-1",
        state: "inherit",
      });

      expect(mockUserFeatureRepo.delete).toHaveBeenCalledWith(1, "test-feature-1");
    });

    it("should throw ErrorWithCode when feature is not allowed at user scope", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(false);

      await expect(
        service.setUserFeatureState({
          userId: 1,
          featureId: "org-only-feature",
          state: "enabled",
          assignedBy: 2,
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        service.setUserFeatureState({
          userId: 1,
          featureId: "org-only-feature",
          state: "enabled",
          assignedBy: 2,
        })
      ).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: 'Feature "org-only-feature" is not available at the user scope',
      });

      expect(mockUserFeatureRepo.upsert).not.toHaveBeenCalled();
    });

    it("should validate scope before setting inherit state", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(false);

      await expect(
        service.setUserFeatureState({
          userId: 1,
          featureId: "team-only-feature",
          state: "inherit",
        })
      ).rejects.toThrow(ErrorWithCode);

      expect(mockUserFeatureRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("setTeamFeatureState", () => {
    it("should set team feature state when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockTeamFeatureRepo.upsert.mockResolvedValue(createMockTeamFeature(1, "test-feature-1", true));

      await service.setTeamFeatureState({
        teamId: 1,
        featureId: "test-feature-1",
        state: "enabled",
        assignedBy: 2,
        scope: "team",
      });

      expect(mockTeamFeatureRepo.upsert).toHaveBeenCalledWith(1, "test-feature-1", true, "user-2");
    });

    it("should set team feature state to inherit when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockTeamFeatureRepo.delete.mockResolvedValue(undefined);

      await service.setTeamFeatureState({
        teamId: 1,
        featureId: "test-feature-1",
        state: "inherit",
        scope: "team",
      });

      expect(mockTeamFeatureRepo.delete).toHaveBeenCalledWith(1, "test-feature-1");
    });

    it("should throw ErrorWithCode when feature is not allowed at team scope", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(false);

      await expect(
        service.setTeamFeatureState({
          teamId: 1,
          featureId: "user-only-feature",
          state: "enabled",
          assignedBy: 2,
          scope: "team",
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        service.setTeamFeatureState({
          teamId: 1,
          featureId: "user-only-feature",
          state: "enabled",
          assignedBy: 2,
          scope: "team",
        })
      ).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: 'Feature "user-only-feature" is not available at the team scope',
      });

      expect(mockTeamFeatureRepo.upsert).not.toHaveBeenCalled();
    });

    it("should throw ErrorWithCode when feature is not allowed at org scope", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(false);

      await expect(
        service.setTeamFeatureState({
          teamId: 100,
          featureId: "team-only-feature",
          state: "enabled",
          assignedBy: 2,
          scope: "org",
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        service.setTeamFeatureState({
          teamId: 100,
          featureId: "team-only-feature",
          state: "enabled",
          assignedBy: 2,
          scope: "org",
        })
      ).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: 'Feature "team-only-feature" is not available at the org scope',
      });

      expect(mockTeamFeatureRepo.upsert).not.toHaveBeenCalled();
    });

    it("should default to team scope when scope is not provided", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockTeamFeatureRepo.upsert.mockResolvedValue(createMockTeamFeature(1, "test-feature-1", true));

      await service.setTeamFeatureState({
        teamId: 1,
        featureId: "test-feature-1",
        state: "enabled",
        assignedBy: 2,
      });

      expect(mockIsFeatureAllowedForScope).toHaveBeenCalledWith("test-feature-1", "team");
    });

    it("should validate scope before setting inherit state", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(false);

      await expect(
        service.setTeamFeatureState({
          teamId: 1,
          featureId: "user-only-feature",
          state: "inherit",
          scope: "team",
        })
      ).rejects.toThrow(ErrorWithCode);

      expect(mockTeamFeatureRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("checkFeatureOptInEligibility", () => {
    beforeEach(async () => {
      vi.resetAllMocks();
      mockFindAllByUserId.mockReset();
      mockCheckPermission = vi.fn();
      mockFindOwnedTeamsByUserId = vi.fn();

      mockFeatureRepo = {
        findAll: vi.fn(),
      };
      mockTeamFeatureRepo = {
        findByTeamIdAndFeatureId: vi.fn(),
        findByTeamIdsAndFeatureIds: vi.fn().mockResolvedValue({}),
        upsert: vi.fn(),
        delete: vi.fn(),
        findAutoOptInByTeamId: vi.fn(),
        findAutoOptInByTeamIds: vi.fn().mockResolvedValue({}),
        setAutoOptIn: vi.fn(),
      };
      mockUserFeatureRepo = {
        findByUserIdAndFeatureId: vi.fn(),
        findByUserIdAndFeatureIds: vi.fn().mockResolvedValue({}),
        upsert: vi.fn(),
        delete: vi.fn(),
        findAutoOptInByUserId: vi.fn().mockResolvedValue(false),
        setAutoOptIn: vi.fn(),
      };

      mockDeps = {
        featureRepo: mockFeatureRepo as unknown as IFeatureRepository,
        teamFeatureRepo: mockTeamFeatureRepo as unknown as ITeamFeatureRepository,
        userFeatureRepo: mockUserFeatureRepo as unknown as IUserFeatureRepository,
      };

      service = new FeatureOptInService(mockDeps);
    });

    it("should return invalid_feature for non-opt-in features", async () => {
      const result = await service.checkFeatureOptInEligibility({
        userId: 1,
        featureId: "non-existent-feature",
      });

      expect(result).toEqual({
        status: "invalid_feature",
        canOptIn: false,
        userRoleContext: null,
        blockingReason: null,
      });
    });

    it("should return feature_disabled when feature is globally disabled", async () => {
      mockFindAllByUserId.mockResolvedValue([]);
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: false }]);
      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({});

      const result = await service.checkFeatureOptInEligibility({
        userId: 1,
        featureId: "test-feature-1",
      });

      expect(result).toEqual({
        status: "feature_disabled",
        canOptIn: false,
        userRoleContext: null,
        blockingReason: "feature_global_disabled",
      });
    });

    it("should return already_enabled when feature is already enabled for user", async () => {
      mockFindAllByUserId.mockResolvedValue([]);
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: true }]);
      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({});
      mockUserFeatureRepo.findByUserIdAndFeatureIds.mockResolvedValue({
        "test-feature-1": createMockUserFeature(1, "test-feature-1", true),
      });
      mockFindOwnedTeamsByUserId.mockResolvedValue([]);

      const result = await service.checkFeatureOptInEligibility({
        userId: 1,
        featureId: "test-feature-1",
      });

      expect(result).toEqual({
        status: "already_enabled",
        canOptIn: false,
        userRoleContext: null,
        blockingReason: null,
      });
    });

    it("should return blocked when feature is blocked by org", async () => {
      mockFindAllByUserId.mockResolvedValue([
        { teamId: 100, role: "MEMBER", team: { id: 100, isOrganization: true, parentId: null } },
      ]);
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: true }]);
      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({
        "test-feature-1": { 100: createMockTeamFeature(100, "test-feature-1", false) },
      });
      mockFindOwnedTeamsByUserId.mockResolvedValue([]);

      const result = await service.checkFeatureOptInEligibility({
        userId: 1,
        featureId: "test-feature-1",
      });

      expect(result.status).toBe("blocked");
      expect(result.canOptIn).toBe(false);
      expect(result.blockingReason).toBe("feature_org_disabled");
      expect(result.userRoleContext).toMatchObject({
        orgId: 100,
        adminTeamIds: [],
        adminTeamNames: [],
      });
    });

    it("should return can_opt_in when user can opt in", async () => {
      mockFindAllByUserId.mockResolvedValue([
        { teamId: 1, role: "MEMBER", team: { id: 1, isOrganization: false, parentId: null } },
      ]);
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: true }]);
      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({});
      mockFindOwnedTeamsByUserId.mockResolvedValue([]);

      const result = await service.checkFeatureOptInEligibility({
        userId: 1,
        featureId: "test-feature-1",
      });

      expect(result.status).toBe("can_opt_in");
      expect(result.canOptIn).toBe(true);
      expect(result.userRoleContext).toMatchObject({
        orgId: null,
        adminTeamIds: [],
        adminTeamNames: [],
      });
      expect(result.blockingReason).toBeNull();
    });

    it("should include admin teams in user role context", async () => {
      mockFindAllByUserId.mockResolvedValue([
        { teamId: 1, role: "ADMIN", team: { id: 1, isOrganization: false, parentId: null } },
        { teamId: 2, role: "MEMBER", team: { id: 2, isOrganization: false, parentId: null } },
      ]);
      mockFeatureRepo.findAll.mockResolvedValue([{ slug: "test-feature-1", enabled: true }]);
      mockTeamFeatureRepo.findByTeamIdsAndFeatureIds.mockResolvedValue({});
      mockFindOwnedTeamsByUserId.mockResolvedValue([{ id: 1, name: "Team 1", isOrganization: false }]);

      const result = await service.checkFeatureOptInEligibility({
        userId: 1,
        featureId: "test-feature-1",
      });

      expect(result.status).toBe("can_opt_in");
      expect(result.userRoleContext?.adminTeamIds).toEqual([1]);
      expect(result.userRoleContext?.adminTeamNames).toEqual([{ id: 1, name: "Team 1" }]);
    });
  });

  describe("checkFeatureOptInEligibility - simulation logic", () => {
    let mockMembershipRepository: { findAllByUserId: ReturnType<typeof vi.fn> };
    let mockPermissionCheckService: { checkPermission: ReturnType<typeof vi.fn> };
    let mockTeamRepository: { findOwnedTeamsByUserId: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockMembershipRepository = {
        findAllByUserId: vi.fn(),
      };
      mockPermissionCheckService = {
        checkPermission: vi.fn(),
      };
      mockTeamRepository = {
        findOwnedTeamsByUserId: vi.fn(),
      };

      vi.doMock("@calcom/features/membership/repositories/MembershipRepository", () => ({
        MembershipRepository: class {
          findAllByUserId(...args: unknown[]): unknown {
            return mockMembershipRepository.findAllByUserId(...args);
          }
        },
      }));
      vi.doMock("@calcom/features/pbac/services/permission-check.service", () => ({
        PermissionCheckService: vi.fn(() => mockPermissionCheckService),
      }));
      vi.doMock("@calcom/features/ee/teams/repositories/TeamRepository", () => ({
        TeamRepository: vi.fn(() => mockTeamRepository),
      }));
    });

    it("should return blocked when strict policy feature would not be enabled even after user opts in", async () => {
      const { computeEffectiveStateAcrossTeams } = await import("../lib/computeEffectiveState");

      const result = computeEffectiveStateAcrossTeams({
        globalEnabled: true,
        orgState: "inherit",
        teamStates: ["inherit"],
        userState: "enabled",
        policy: "strict",
      });

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("feature_user_only_not_allowed");
    });

    it("should return enabled when permissive policy feature would be enabled after user opts in", async () => {
      const { computeEffectiveStateAcrossTeams } = await import("../lib/computeEffectiveState");

      const result = computeEffectiveStateAcrossTeams({
        globalEnabled: true,
        orgState: "inherit",
        teamStates: ["inherit"],
        userState: "enabled",
        policy: "permissive",
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("feature_enabled");
    });

    it("should return enabled when strict policy feature has org enablement and user opts in", async () => {
      const { computeEffectiveStateAcrossTeams } = await import("../lib/computeEffectiveState");

      const result = computeEffectiveStateAcrossTeams({
        globalEnabled: true,
        orgState: "enabled",
        teamStates: ["inherit"],
        userState: "enabled",
        policy: "strict",
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("feature_enabled");
    });

    it("should return blocked when strict policy feature has any team disabled", async () => {
      const { computeEffectiveStateAcrossTeams } = await import("../lib/computeEffectiveState");

      const result = computeEffectiveStateAcrossTeams({
        globalEnabled: true,
        orgState: "enabled",
        teamStates: ["disabled", "inherit"],
        userState: "enabled",
        policy: "strict",
      });

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("feature_any_team_disabled");
    });
  });
});
