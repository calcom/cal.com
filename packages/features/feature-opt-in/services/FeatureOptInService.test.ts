import { describe, it, expect, vi, beforeEach } from "vitest";

import type { FeatureState } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { FeatureOptInService } from "./FeatureOptInService";

// Mock the OPT_IN_FEATURES config
vi.mock("../config", () => {
  const mockOptInFeatures = [
    {
      slug: "test-feature-1",
      titleI18nKey: "test_feature_1",
      descriptionI18nKey: "test_feature_1_desc",
      policy: "permissive",
    },
    {
      slug: "test-feature-2",
      titleI18nKey: "test_feature_2",
      descriptionI18nKey: "test_feature_2_desc",
      policy: "permissive",
    },
  ];
  return {
    OPT_IN_FEATURES: mockOptInFeatures,
    isOptInFeature: (slug: string) => ["test-feature-1", "test-feature-2"].includes(slug),
    getOptInFeatureConfig: (slug: string) => mockOptInFeatures.find((f) => f.slug === slug),
  };
});

// Mock MembershipRepository
vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    findAllByUserId: vi.fn(),
  },
}));

// Mock PermissionCheckService - needs to be a class that can be instantiated
let mockCheckPermission = vi.fn();
vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: class {
    checkPermission(...args: unknown[]) {
      return mockCheckPermission(...args);
    }
  },
}));

// Mock TeamRepository - needs to be a class that can be instantiated
let mockFindOwnedTeamsByUserId = vi.fn();
vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => ({
  TeamRepository: class {
    findOwnedTeamsByUserId(...args: unknown[]) {
      return mockFindOwnedTeamsByUserId(...args);
    }
  },
}));

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

describe("FeatureOptInService", () => {
  let mockFeaturesRepository: {
    getAllFeatures: ReturnType<typeof vi.fn>;
    getTeamsFeatureStates: ReturnType<typeof vi.fn>;
  };
  let service: FeatureOptInService;

  beforeEach(() => {
    vi.resetAllMocks();

    mockFeaturesRepository = {
      getAllFeatures: vi.fn(),
      getTeamsFeatureStates: vi.fn(),
    };

    service = new FeatureOptInService(mockFeaturesRepository as unknown as FeaturesRepository);
  });

  describe("listFeaturesForTeam", () => {
    it("should return features with team state when no parent org", async () => {
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
        { slug: "test-feature-2", enabled: true },
      ]);

      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({
        "test-feature-1": { 1: "enabled" as FeatureState },
        "test-feature-2": { 1: "disabled" as FeatureState },
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
      expect(mockFeaturesRepository.getTeamsFeatureStates).toHaveBeenCalledWith({
        teamIds: [1],
        featureIds: ["test-feature-1", "test-feature-2"],
      });
    });

    it("should return features with team and org state when parent org exists", async () => {
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
        { slug: "test-feature-2", enabled: true },
      ]);

      // Team ID is 1, Parent Org ID is 100
      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({
        "test-feature-1": { 1: "enabled" as FeatureState, 100: "disabled" as FeatureState },
        "test-feature-2": { 1: "inherit" as FeatureState, 100: "enabled" as FeatureState },
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
      expect(mockFeaturesRepository.getTeamsFeatureStates).toHaveBeenCalledWith({
        teamIds: [1, 100],
        featureIds: ["test-feature-1", "test-feature-2"],
      });
    });

    it("should return inherit for org state when parent org has no explicit state", async () => {
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
      ]);

      // Team ID is 1, Parent Org ID is 100, but org has no explicit state
      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({
        "test-feature-1": { 1: "enabled" as FeatureState },
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
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
        { slug: "test-feature-2", enabled: false },
      ]);

      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({
        "test-feature-1": { 1: "enabled" as FeatureState },
        "test-feature-2": { 1: "enabled" as FeatureState },
      });

      const result = await service.listFeaturesForTeam({ teamId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].featureId).toBe("test-feature-1");
    });

    it("should return inherit for team state when team has no explicit state", async () => {
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
      ]);

      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({
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
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
      ]);

      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({
        "test-feature-1": { 1: "enabled" as FeatureState },
      });

      const result = await service.listFeaturesForTeam({ teamId: 1, parentOrgId: null });

      expect(result).toHaveLength(1);
      expect(result[0].orgState).toBe("inherit");

      // Verify that only the team ID was queried (no parent org)
      expect(mockFeaturesRepository.getTeamsFeatureStates).toHaveBeenCalledWith({
        teamIds: [1],
        featureIds: ["test-feature-1", "test-feature-2"],
      });
    });
  });

  describe("checkFeatureOptInEligibility", () => {
    const mockFindAllByUserId = vi.fn();

    beforeEach(async () => {
      vi.resetAllMocks();
      mockCheckPermission = vi.fn();
      mockFindOwnedTeamsByUserId = vi.fn();

      mockFeaturesRepository = {
        getAllFeatures: vi.fn(),
        getTeamsFeatureStates: vi.fn(),
        getUserFeatureStates: vi.fn().mockResolvedValue({}),
        getUserAutoOptIn: vi.fn().mockResolvedValue(false),
        getTeamsAutoOptIn: vi.fn().mockResolvedValue({}),
      };

      service = new FeatureOptInService(mockFeaturesRepository as unknown as FeaturesRepository);

      const { MembershipRepository } = await import(
        "@calcom/features/membership/repositories/MembershipRepository"
      );

      vi.mocked(MembershipRepository.findAllByUserId).mockImplementation(mockFindAllByUserId);
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
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: false },
      ]);
      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({});

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
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
      ]);
      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({});
      mockFeaturesRepository.getUserFeatureStates.mockResolvedValue({
        "test-feature-1": "enabled" as FeatureState,
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
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
      ]);
      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({
        "test-feature-1": { 100: "disabled" as FeatureState },
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
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
      ]);
      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({});
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
      mockFeaturesRepository.getAllFeatures.mockResolvedValue([
        { slug: "test-feature-1", enabled: true },
      ]);
      mockFeaturesRepository.getTeamsFeatureStates.mockResolvedValue({});
      mockFindOwnedTeamsByUserId.mockResolvedValue([
        { id: 1, name: "Team 1", isOrganization: false },
      ]);

      const result = await service.checkFeatureOptInEligibility({
        userId: 1,
        featureId: "test-feature-1",
      });

      expect(result.status).toBe("can_opt_in");
      expect(result.userRoleContext?.adminTeamIds).toEqual([1]);
      expect(result.userRoleContext?.adminTeamNames).toEqual([{ id: 1, name: "Team 1" }]);
    });
  });
});
