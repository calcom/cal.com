import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckIfTeamHasFeature = vi.fn();

import { LegacyRemoveMemberService } from "../LegacyRemoveMemberService";
import { PBACRemoveMemberService } from "../PBACRemoveMemberService";
import { RemoveMemberServiceFactory } from "../RemoveMemberServiceFactory";

vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: () => ({
    checkIfTeamHasFeature: mockCheckIfTeamHasFeature,
  }),
}));
vi.mock("../LegacyRemoveMemberService");
vi.mock("../PBACRemoveMemberService");

describe("RemoveMemberServiceFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckIfTeamHasFeature.mockReset();
  });

  describe("Service Creation", () => {
    it("should create LegacyRemoveMemberService when PBAC is disabled", async () => {
      mockCheckIfTeamHasFeature.mockResolvedValue(false);

      const teamId = 1;
      const service = await RemoveMemberServiceFactory.create(teamId);

      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(teamId, "pbac");
      expect(service).toBeInstanceOf(LegacyRemoveMemberService);
    });

    it("should create PBACRemoveMemberService when PBAC is enabled", async () => {
      mockCheckIfTeamHasFeature.mockResolvedValue(true);

      const teamId = 1;
      const service = await RemoveMemberServiceFactory.create(teamId);

      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(teamId, "pbac");
      expect(service).toBeInstanceOf(PBACRemoveMemberService);
    });
  });

  describe("Service Creation for Different Teams", () => {
    it("should create different services for different teams", async () => {
      // Team 1 has PBAC disabled
      mockCheckIfTeamHasFeature.mockResolvedValueOnce(false);
      // Team 2 has PBAC enabled
      mockCheckIfTeamHasFeature.mockResolvedValueOnce(true);

      const service1 = await RemoveMemberServiceFactory.create(1);
      const service2 = await RemoveMemberServiceFactory.create(2);

      expect(service1).toBeInstanceOf(LegacyRemoveMemberService);
      expect(service2).toBeInstanceOf(PBACRemoveMemberService);
      expect(service1).not.toBe(service2);

      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledTimes(2);
      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(2, "pbac");
    });

    it("should create service for each call (no caching in current implementation)", async () => {
      mockCheckIfTeamHasFeature.mockResolvedValue(true);

      const teamId = 1;

      // Make multiple calls
      const service1 = await RemoveMemberServiceFactory.create(teamId);
      const service2 = await RemoveMemberServiceFactory.create(teamId);
      const service3 = await RemoveMemberServiceFactory.create(teamId);

      // All should be different instances (no caching currently)
      expect(service1).not.toBe(service2);
      expect(service2).not.toBe(service3);

      // Feature flag should be called each time
      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledTimes(3);
    });
  });

  describe("Error Handling", () => {
    it("should propagate errors from features repository", async () => {
      const error = new Error("Features repository error");
      mockCheckIfTeamHasFeature.mockRejectedValue(error);

      await expect(RemoveMemberServiceFactory.create(1)).rejects.toThrow("Features repository error");
    });

    it("should handle null/undefined feature flag gracefully", async () => {
      mockCheckIfTeamHasFeature.mockResolvedValue(null as any);

      const service = await RemoveMemberServiceFactory.create(1);

      // Should default to Legacy when feature flag is falsy
      expect(service).toBeInstanceOf(LegacyRemoveMemberService);
    });
  });
});
