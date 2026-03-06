import { ErrorWithCode } from "@calcom/lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExperimentWithVariants, IExperimentRepository } from "../repositories/IExperimentRepository";
import { ExperimentService } from "../services/ExperimentService";

function createMockRepo(overrides: Partial<IExperimentRepository> = {}): IExperimentRepository {
  return {
    findBySlug: vi.fn().mockResolvedValue(null),
    findAllRunning: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    updateVariantWeight: vi.fn().mockResolvedValue(undefined),
    setWinner: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function runningExperiment(
  slug: string,
  variants: { variantSlug: string; weight: number }[]
): ExperimentWithVariants {
  return { slug, status: "RUNNING", winner: null, variants };
}

function rolledOutExperiment(slug: string, winner: string | null): ExperimentWithVariants {
  return { slug, status: "ROLLED_OUT", winner, variants: [] };
}

describe("ExperimentService", () => {
  let service: ExperimentService;
  let mockRepo: IExperimentRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new ExperimentService({ experimentRepo: mockRepo });
  });

  describe("getAllRunningConfigs", () => {
    it("returns mapped configs from running experiments", async () => {
      const experiments: ExperimentWithVariants[] = [
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }]),
      ];
      vi.mocked(mockRepo.findAllRunning).mockResolvedValue(experiments);

      const configs = await service.getAllRunningConfigs();

      expect(configs).toEqual([
        {
          slug: "billing-upgrade-cta",
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "upgrade_button", weight: 50 }],
        },
      ]);
    });

    it("returns empty array when no running experiments", async () => {
      const configs = await service.getAllRunningConfigs();
      expect(configs).toEqual([]);
    });
  });

  describe("getVariantsForUser", () => {
    it("assigns variant based on deterministic hash", async () => {
      const configs = [
        {
          slug: "billing-upgrade-cta",
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "upgrade_button", weight: 50 }],
        },
      ];

      const result = await service.getVariantsForUser(42, "INDIVIDUALS", configs);
      expect(result).toHaveProperty("billing-upgrade-cta");
      expect(["upgrade_button", null]).toContain(result["billing-upgrade-cta"]);
    });

    it("returns same variant for same user across calls", async () => {
      const configs = [
        {
          slug: "billing-upgrade-cta",
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "upgrade_button", weight: 50 }],
        },
      ];

      const result1 = await service.getVariantsForUser(42, "INDIVIDUALS", configs);
      const result2 = await service.getVariantsForUser(42, "INDIVIDUALS", configs);
      expect(result1["billing-upgrade-cta"]).toBe(result2["billing-upgrade-cta"]);
    });

    it("returns control for ENTERPRISE users", async () => {
      const configs = [
        {
          slug: "billing-upgrade-cta",
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "upgrade_button", weight: 100 }],
        },
      ];

      const result = await service.getVariantsForUser(42, "ENTERPRISE", configs);
      expect(result["billing-upgrade-cta"]).toBeNull();
    });

    it("returns winner for rolled-out experiments", async () => {
      const configs = [
        { slug: "billing-upgrade-cta", status: "ROLLED_OUT", winner: "upgrade_button", variants: [] },
      ];

      const result = await service.getVariantsForUser(42, "INDIVIDUALS", configs);
      expect(result["billing-upgrade-cta"]).toBe("upgrade_button");
    });

    it("returns null winner for rolled-out experiments where control won", async () => {
      const configs = [{ slug: "billing-upgrade-cta", status: "ROLLED_OUT", winner: null, variants: [] }];

      const result = await service.getVariantsForUser(42, "INDIVIDUALS", configs);
      expect(result["billing-upgrade-cta"]).toBeNull();
    });
  });

  describe("getVariant", () => {
    it("returns null for unknown experiment slug", async () => {
      const result = await service.getVariant(42, "nonexistent-experiment");
      expect(result).toBeNull();
    });

    it("returns null when experiment not in database", async () => {
      const result = await service.getVariant(42, "billing-upgrade-cta");
      expect(result).toBeNull();
    });

    it("returns null for DRAFT experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({
        slug: "billing-upgrade-cta",
        status: "DRAFT",
        winner: null,
        variants: [{ variantSlug: "upgrade_button", weight: 50 }],
      });

      const result = await service.getVariant(42, "billing-upgrade-cta");
      expect(result).toBeNull();
    });

    it("returns null for STOPPED experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({
        slug: "billing-upgrade-cta",
        status: "STOPPED",
        winner: null,
        variants: [{ variantSlug: "upgrade_button", weight: 50 }],
      });

      const result = await service.getVariant(42, "billing-upgrade-cta");
      expect(result).toBeNull();
    });

    it("returns winner for ROLLED_OUT experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        rolledOutExperiment("billing-upgrade-cta", "upgrade_button")
      );

      const result = await service.getVariant(42, "billing-upgrade-cta");
      expect(result).toBe("upgrade_button");
    });

    it("returns deterministic variant for RUNNING experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }])
      );

      const result1 = await service.getVariant(42, "billing-upgrade-cta");
      const result2 = await service.getVariant(42, "billing-upgrade-cta");
      expect(result1).toBe(result2);
    });
  });

  describe("getAllConfigs", () => {
    it("returns mapped configs from all experiments", async () => {
      const experiments: ExperimentWithVariants[] = [
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }]),
        { slug: "another-exp", status: "DRAFT", winner: null, variants: [] },
      ];
      vi.mocked(mockRepo.findAll).mockResolvedValue(experiments);

      const configs = await service.getAllConfigs();

      expect(configs).toHaveLength(2);
      expect(configs[0].slug).toBe("billing-upgrade-cta");
      expect(configs[1].slug).toBe("another-exp");
    });
  });

  describe("updateStatus", () => {
    it("throws NotFound when experiment does not exist", async () => {
      await expect(service.updateStatus("nonexistent", "RUNNING")).rejects.toThrow(ErrorWithCode);
    });

    it("updates status when experiment exists", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }])
      );

      await service.updateStatus("billing-upgrade-cta", "STOPPED");

      expect(mockRepo.updateStatus).toHaveBeenCalledWith("billing-upgrade-cta", "STOPPED");
    });
  });

  describe("updateVariantWeight", () => {
    it("throws NotFound when experiment does not exist", async () => {
      await expect(service.updateVariantWeight("nonexistent", "variant_a", 50)).rejects.toThrow(
        ErrorWithCode
      );
    });

    it("throws BadRequest when weight is negative", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }])
      );

      await expect(service.updateVariantWeight("billing-upgrade-cta", "upgrade_button", -1)).rejects.toThrow(
        ErrorWithCode
      );
    });

    it("throws BadRequest when weight exceeds 100", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }])
      );

      await expect(service.updateVariantWeight("billing-upgrade-cta", "upgrade_button", 101)).rejects.toThrow(
        ErrorWithCode
      );
    });

    it("updates weight when experiment exists and weight is valid", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }])
      );

      await service.updateVariantWeight("billing-upgrade-cta", "upgrade_button", 75);

      expect(mockRepo.updateVariantWeight).toHaveBeenCalledWith("billing-upgrade-cta", "upgrade_button", 75);
    });
  });

  describe("setWinner", () => {
    it("throws NotFound when experiment does not exist", async () => {
      await expect(service.setWinner("nonexistent", "variant_a")).rejects.toThrow(ErrorWithCode);
    });

    it("sets winner when experiment exists", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }])
      );

      await service.setWinner("billing-upgrade-cta", "upgrade_button");

      expect(mockRepo.setWinner).toHaveBeenCalledWith("billing-upgrade-cta", "upgrade_button");
    });

    it("sets null winner (control wins) when experiment exists", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [{ variantSlug: "upgrade_button", weight: 50 }])
      );

      await service.setWinner("billing-upgrade-cta", null);

      expect(mockRepo.setWinner).toHaveBeenCalledWith("billing-upgrade-cta", null);
    });
  });
});
