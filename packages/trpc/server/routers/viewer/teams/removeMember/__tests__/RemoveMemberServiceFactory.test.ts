import { describe, expect, it, vi, beforeEach } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { LegacyRemoveMemberService } from "../LegacyRemoveMemberService";
import { PBACRemoveMemberService } from "../PBACRemoveMemberService";
import { RemoveMemberServiceFactory } from "../RemoveMemberServiceFactory";

vi.mock("@calcom/features/flags/features.repository");
vi.mock("../LegacyRemoveMemberService");
vi.mock("../PBACRemoveMemberService");

describe("RemoveMemberServiceFactory", () => {
  let mockFeaturesRepository: {
    checkIfTeamHasFeature: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeaturesRepository = {
      checkIfTeamHasFeature: vi.fn(),
    };

    vi.mocked(FeaturesRepository).mockImplementation(function () {
      return mockFeaturesRepository as any;
    });
  });

  describe("Service Creation", () => {
    it("should create LegacyRemoveMemberService when PBAC is disabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);

      const teamId = 1;
      const service = await RemoveMemberServiceFactory.create(teamId);

      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(teamId, "pbac");
      expect(service).toBeInstanceOf(LegacyRemoveMemberService);
    });

    it("should create PBACRemoveMemberService when PBAC is enabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);

      const teamId = 1;
      const service = await RemoveMemberServiceFactory.create(teamId);

      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(teamId, "pbac");
      expect(service).toBeInstanceOf(PBACRemoveMemberService);
    });
  });

  describe("Service Creation for Different Teams", () => {
    it("should create different services for different teams", async () => {
      // Team 1 has PBAC disabled
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);
      // Team 2 has PBAC enabled
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);

      const service1 = await RemoveMemberServiceFactory.create(1);
      const service2 = await RemoveMemberServiceFactory.create(2);

      expect(service1).toBeInstanceOf(LegacyRemoveMemberService);
      expect(service2).toBeInstanceOf(PBACRemoveMemberService);
      expect(service1).not.toBe(service2);

      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledTimes(2);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(2, "pbac");
    });

    it("should create service for each call (no caching in current implementation)", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);

      const teamId = 1;

      // Make multiple calls
      const service1 = await RemoveMemberServiceFactory.create(teamId);
      const service2 = await RemoveMemberServiceFactory.create(teamId);
      const service3 = await RemoveMemberServiceFactory.create(teamId);

      // All should be different instances (no caching currently)
      expect(service1).not.toBe(service2);
      expect(service2).not.toBe(service3);

      // Feature flag should be called each time
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledTimes(3);
    });
  });

  describe("Error Handling", () => {
    it("should propagate errors from features repository", async () => {
      const error = new Error("Features repository error");
      mockFeaturesRepository.checkIfTeamHasFeature.mockRejectedValue(error);

      await expect(RemoveMemberServiceFactory.create(1)).rejects.toThrow("Features repository error");
    });

    it("should handle null/undefined feature flag gracefully", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(null as any);

      const service = await RemoveMemberServiceFactory.create(1);

      // Should default to Legacy when feature flag is falsy
      expect(service).toBeInstanceOf(LegacyRemoveMemberService);
    });
  });
});
