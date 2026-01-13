import { describe, it, expect, vi, beforeEach } from "vitest";

import type { FeatureState } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { FeatureOptInService } from "./FeatureOptInService";

// Mock the OPT_IN_FEATURES config
vi.mock("../config", () => ({
  OPT_IN_FEATURES: [
    { slug: "test-feature-1", titleI18nKey: "test_feature_1", descriptionI18nKey: "test_feature_1_desc" },
    { slug: "test-feature-2", titleI18nKey: "test_feature_2", descriptionI18nKey: "test_feature_2_desc" },
  ],
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
});
