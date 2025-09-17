import { describe, expect, it, beforeEach, vi } from "vitest";

import { CacheService } from "./getShouldServeCache";

describe("CacheService", () => {
  let cacheService: CacheService;
  let mockFeaturesRepo: {
    checkIfTeamHasFeature: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeaturesRepo = {
      checkIfTeamHasFeature: vi.fn(),
    };
    cacheService = new CacheService({ featuresRepository: mockFeaturesRepo });
  });

  it("should return true when shouldServeCache is explicitly true", async () => {
    const result = await cacheService.getShouldServeCache(true);

    expect(result).toBe(true);
    expect(mockFeaturesRepo.checkIfTeamHasFeature).not.toHaveBeenCalled();
  });

  it("should return false when shouldServeCache is explicitly false", async () => {
    const result = await cacheService.getShouldServeCache(false);

    expect(result).toBe(false);
    expect(mockFeaturesRepo.checkIfTeamHasFeature).not.toHaveBeenCalled();
  });

  it("should return undefined when shouldServeCache is undefined and no teamId provided", async () => {
    const result = await cacheService.getShouldServeCache(undefined);

    expect(result).toBeUndefined();
    expect(mockFeaturesRepo.checkIfTeamHasFeature).not.toHaveBeenCalled();
  });

  it("should check team feature when shouldServeCache is undefined and teamId is provided", async () => {
    mockFeaturesRepo.checkIfTeamHasFeature.mockResolvedValue(true);

    const result = await cacheService.getShouldServeCache(undefined, 123);

    expect(result).toBe(true);
    expect(mockFeaturesRepo.checkIfTeamHasFeature).toHaveBeenCalledWith(123, "calendar-cache-serve");
  });

  it("should return false when team feature check returns false", async () => {
    mockFeaturesRepo.checkIfTeamHasFeature.mockResolvedValue(false);

    const result = await cacheService.getShouldServeCache(undefined, 123);

    expect(result).toBe(false);
    expect(mockFeaturesRepo.checkIfTeamHasFeature).toHaveBeenCalledWith(123, "calendar-cache-serve");
  });

  it("should handle feature repository errors", async () => {
    mockFeaturesRepo.checkIfTeamHasFeature.mockRejectedValue(new Error("Database error"));

    await expect(cacheService.getShouldServeCache(undefined, 123)).rejects.toThrow("Database error");
  });

  it("should prioritize explicit shouldServeCache value over team feature check", async () => {
    mockFeaturesRepo.checkIfTeamHasFeature.mockResolvedValue(true);

    const resultTrue = await cacheService.getShouldServeCache(true, 123);
    const resultFalse = await cacheService.getShouldServeCache(false, 123);

    expect(resultTrue).toBe(true);
    expect(resultFalse).toBe(false);
    expect(mockFeaturesRepo.checkIfTeamHasFeature).not.toHaveBeenCalled();
  });
});
