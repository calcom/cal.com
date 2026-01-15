import { describe, it, expect, vi, beforeEach } from "vitest";

import type { FeatureState } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import { FeatureOptInService } from "./FeatureOptInService";

const mockIsFeatureAllowedForScope = vi.fn();

vi.mock("../config", () => {
  const mockFeatures = [
    { slug: "test-feature-1", titleI18nKey: "test_feature_1", descriptionI18nKey: "test_feature_1_desc" },
    { slug: "test-feature-2", titleI18nKey: "test_feature_2", descriptionI18nKey: "test_feature_2_desc" },
    { slug: "org-only-feature", titleI18nKey: "org_only", descriptionI18nKey: "org_only_desc", scope: ["org"] },
    { slug: "team-only-feature", titleI18nKey: "team_only", descriptionI18nKey: "team_only_desc", scope: ["team"] },
    { slug: "user-only-feature", titleI18nKey: "user_only", descriptionI18nKey: "user_only_desc", scope: ["user"] },
  ];
  return {
    OPT_IN_FEATURES: mockFeatures,
    getOptInFeaturesForScope: () => mockFeatures,
    get isFeatureAllowedForScope() {
      return mockIsFeatureAllowedForScope;
    },
    getOptInFeatureConfig: (slug: string) => mockFeatures.find((f) => f.slug === slug),
  };
});

describe("FeatureOptInService", () => {
  let mockFeaturesRepository: {
    getAllFeatures: ReturnType<typeof vi.fn>;
    getTeamsFeatureStates: ReturnType<typeof vi.fn>;
    setUserFeatureState: ReturnType<typeof vi.fn>;
    setTeamFeatureState: ReturnType<typeof vi.fn>;
  };
  let service: FeatureOptInService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockIsFeatureAllowedForScope.mockReturnValue(true);

    mockFeaturesRepository = {
      getAllFeatures: vi.fn(),
      getTeamsFeatureStates: vi.fn(),
      setUserFeatureState: vi.fn(),
      setTeamFeatureState: vi.fn(),
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
        featureIds: ["test-feature-1", "test-feature-2", "org-only-feature", "team-only-feature", "user-only-feature"],
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
        featureIds: ["test-feature-1", "test-feature-2", "org-only-feature", "team-only-feature", "user-only-feature"],
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
        featureIds: ["test-feature-1", "test-feature-2", "org-only-feature", "team-only-feature", "user-only-feature"],
      });
    });
  });

  describe("setUserFeatureState", () => {
    it("should set user feature state when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockFeaturesRepository.setUserFeatureState.mockResolvedValue(undefined);

      await service.setUserFeatureState({
        userId: 1,
        featureId: "test-feature-1",
        state: "enabled",
        assignedBy: 2,
      });

      expect(mockFeaturesRepository.setUserFeatureState).toHaveBeenCalledWith({
        userId: 1,
        featureId: "test-feature-1",
        state: "enabled",
        assignedBy: "user-2",
      });
    });

    it("should set user feature state to inherit when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockFeaturesRepository.setUserFeatureState.mockResolvedValue(undefined);

      await service.setUserFeatureState({
        userId: 1,
        featureId: "test-feature-1",
        state: "inherit",
      });

      expect(mockFeaturesRepository.setUserFeatureState).toHaveBeenCalledWith({
        userId: 1,
        featureId: "test-feature-1",
        state: "inherit",
      });
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

      expect(mockFeaturesRepository.setUserFeatureState).not.toHaveBeenCalled();
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

      expect(mockFeaturesRepository.setUserFeatureState).not.toHaveBeenCalled();
    });
  });

  describe("setTeamFeatureState", () => {
    it("should set team feature state when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockFeaturesRepository.setTeamFeatureState.mockResolvedValue(undefined);

      await service.setTeamFeatureState({
        teamId: 1,
        featureId: "test-feature-1",
        state: "enabled",
        assignedBy: 2,
        scope: "team",
      });

      expect(mockFeaturesRepository.setTeamFeatureState).toHaveBeenCalledWith({
        teamId: 1,
        featureId: "test-feature-1",
        state: "enabled",
        assignedBy: "user-2",
      });
    });

    it("should set team feature state to inherit when scope allows", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockFeaturesRepository.setTeamFeatureState.mockResolvedValue(undefined);

      await service.setTeamFeatureState({
        teamId: 1,
        featureId: "test-feature-1",
        state: "inherit",
        scope: "team",
      });

      expect(mockFeaturesRepository.setTeamFeatureState).toHaveBeenCalledWith({
        teamId: 1,
        featureId: "test-feature-1",
        state: "inherit",
      });
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

      expect(mockFeaturesRepository.setTeamFeatureState).not.toHaveBeenCalled();
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

      expect(mockFeaturesRepository.setTeamFeatureState).not.toHaveBeenCalled();
    });

    it("should default to team scope when scope is not provided", async () => {
      mockIsFeatureAllowedForScope.mockReturnValue(true);
      mockFeaturesRepository.setTeamFeatureState.mockResolvedValue(undefined);

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

      expect(mockFeaturesRepository.setTeamFeatureState).not.toHaveBeenCalled();
    });
  });
});
