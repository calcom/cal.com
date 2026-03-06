import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedExperimentRepository } from "../repositories/CachedExperimentRepository";
import type { ExperimentWithVariants, IExperimentRepository } from "../repositories/IExperimentRepository";

function createMockRedis(): IRedisService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    lrange: vi.fn(),
    lpush: vi.fn(),
  };
}

function createMockRepo(): IExperimentRepository {
  return {
    findBySlug: vi.fn().mockResolvedValue(null),
    findAllRunning: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    updateVariantWeight: vi.fn().mockResolvedValue(undefined),
    setWinner: vi.fn().mockResolvedValue(undefined),
  };
}

let mockRedis: IRedisService;

vi.mock("@calcom/features/di/containers/Redis", () => ({
  getRedisService: () => mockRedis,
}));

const runningExperiment: ExperimentWithVariants = {
  slug: "billing-upgrade-cta",
  status: "RUNNING",
  winner: null,
  variants: [{ variantSlug: "upgrade_button", weight: 50 }],
};

describe("CachedExperimentRepository", () => {
  let innerRepo: IExperimentRepository;
  let cachedRepo: CachedExperimentRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    innerRepo = createMockRepo();
    cachedRepo = new CachedExperimentRepository(innerRepo);
  });

  describe("findBySlug", () => {
    it("returns cached data on cache hit", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(runningExperiment);

      const result = await cachedRepo.findBySlug("billing-upgrade-cta");

      expect(result).toEqual(runningExperiment);
      expect(innerRepo.findBySlug).not.toHaveBeenCalled();
    });

    it("delegates to inner repo on cache miss and caches result", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(innerRepo.findBySlug).mockResolvedValue(runningExperiment);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await cachedRepo.findBySlug("billing-upgrade-cta");

      expect(result).toEqual(runningExperiment);
      expect(innerRepo.findBySlug).toHaveBeenCalledWith("billing-upgrade-cta");
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe("findAllRunning", () => {
    it("returns cached data on cache hit", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue([runningExperiment]);

      const result = await cachedRepo.findAllRunning();

      expect(result).toEqual([runningExperiment]);
      expect(innerRepo.findAllRunning).not.toHaveBeenCalled();
    });

    it("delegates to inner repo on cache miss", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(innerRepo.findAllRunning).mockResolvedValue([runningExperiment]);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await cachedRepo.findAllRunning();

      expect(result).toEqual([runningExperiment]);
      expect(innerRepo.findAllRunning).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("delegates to inner repo on cache miss", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(innerRepo.findAll).mockResolvedValue([runningExperiment]);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await cachedRepo.findAll();

      expect(result).toEqual([runningExperiment]);
      expect(innerRepo.findAll).toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("delegates to inner repo and invalidates cache", async () => {
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      await cachedRepo.updateStatus("billing-upgrade-cta", "STOPPED");

      expect(innerRepo.updateStatus).toHaveBeenCalledWith("billing-upgrade-cta", "STOPPED", undefined);
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe("updateVariantWeight", () => {
    it("delegates to inner repo and invalidates cache", async () => {
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      await cachedRepo.updateVariantWeight("billing-upgrade-cta", "upgrade_button", 75);

      expect(innerRepo.updateVariantWeight).toHaveBeenCalledWith("billing-upgrade-cta", "upgrade_button", 75);
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe("setWinner", () => {
    it("delegates to inner repo and invalidates cache", async () => {
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      await cachedRepo.setWinner("billing-upgrade-cta", "upgrade_button");

      expect(innerRepo.setWinner).toHaveBeenCalledWith("billing-upgrade-cta", "upgrade_button");
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
