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
  variants: { variantSlug: string; label: string | null; weight: number }[]
): ExperimentWithVariants {
  return { slug, label: null, description: null, status: "RUNNING", winner: null, variants };
}

function rolledOutExperiment(slug: string, winner: string | null): ExperimentWithVariants {
  return { slug, label: null, description: null, status: "ROLLED_OUT", winner, variants: [] };
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
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }]),
      ];
      vi.mocked(mockRepo.findAllRunning).mockResolvedValue(experiments);

      const configs = await service.getAllRunningConfigs();

      expect(configs).toEqual([
        {
          slug: "upgrade-dialog-try-cta",
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "try_cta", weight: 50 }],
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
          slug: "upgrade-dialog-try-cta", label: null, description: null,
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "try_cta", weight: 50 }],
        },
      ];

      const result = await service.getVariantsForUser({ userId: 42, userPlan: "INDIVIDUALS", configs });
      expect(result).toHaveProperty("upgrade-dialog-try-cta");
      expect(["try_cta", null]).toContain(result["upgrade-dialog-try-cta"]);
    });

    it("returns same variant for same user across calls", async () => {
      const configs = [
        {
          slug: "upgrade-dialog-try-cta", label: null, description: null,
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "try_cta", weight: 50 }],
        },
      ];

      const result1 = await service.getVariantsForUser({ userId: 42, userPlan: "INDIVIDUALS", configs });
      const result2 = await service.getVariantsForUser({ userId: 42, userPlan: "INDIVIDUALS", configs });
      expect(result1["upgrade-dialog-try-cta"]).toBe(result2["upgrade-dialog-try-cta"]);
    });

    it("returns control for ENTERPRISE users", async () => {
      const configs = [
        {
          slug: "upgrade-dialog-try-cta", label: null, description: null,
          status: "RUNNING",
          winner: null,
          variants: [{ slug: "try_cta", weight: 100 }],
        },
      ];

      const result = await service.getVariantsForUser({ userId: 42, userPlan: "ENTERPRISE", configs });
      expect(result["upgrade-dialog-try-cta"]).toBeNull();
    });

    it("returns winner for rolled-out experiments", async () => {
      const configs = [
        { slug: "upgrade-dialog-try-cta", status: "ROLLED_OUT", winner: "try_cta", variants: [] },
      ];

      const result = await service.getVariantsForUser({ userId: 42, userPlan: "INDIVIDUALS", configs });
      expect(result["upgrade-dialog-try-cta"]).toBe("try_cta");
    });

    it("returns null winner for rolled-out experiments where control won", async () => {
      const configs = [{ slug: "upgrade-dialog-try-cta", status: "ROLLED_OUT", winner: null, variants: [] }];

      const result = await service.getVariantsForUser({ userId: 42, userPlan: "INDIVIDUALS", configs });
      expect(result["upgrade-dialog-try-cta"]).toBeNull();
    });
  });

  describe("getVariant", () => {
    it("returns null for unknown experiment slug", async () => {
      const result = await service.getVariant(42, "nonexistent-experiment");
      expect(result).toBeNull();
    });

    it("returns null when experiment not in database", async () => {
      const result = await service.getVariant(42, "upgrade-dialog-try-cta");
      expect(result).toBeNull();
    });

    it("returns null for DRAFT experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({
        slug: "upgrade-dialog-try-cta", label: null, description: null,
        status: "DRAFT",
        winner: null,
        variants: [{ variantSlug: "try_cta", label: null, weight: 50 }],
      });

      const result = await service.getVariant(42, "upgrade-dialog-try-cta");
      expect(result).toBeNull();
    });

    it("returns null for STOPPED experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({
        slug: "upgrade-dialog-try-cta", label: null, description: null,
        status: "STOPPED",
        winner: null,
        variants: [{ variantSlug: "try_cta", label: null, weight: 50 }],
      });

      const result = await service.getVariant(42, "upgrade-dialog-try-cta");
      expect(result).toBeNull();
    });

    it("returns winner for ROLLED_OUT experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        rolledOutExperiment("upgrade-dialog-try-cta", "try_cta")
      );

      const result = await service.getVariant(42, "upgrade-dialog-try-cta");
      expect(result).toBe("try_cta");
    });

    it("returns deterministic variant for RUNNING experiments", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }])
      );

      const result1 = await service.getVariant(42, "upgrade-dialog-try-cta");
      const result2 = await service.getVariant(42, "upgrade-dialog-try-cta");
      expect(result1).toBe(result2);
    });
  });

  describe("getAllConfigs", () => {
    it("returns mapped configs from all experiments", async () => {
      const experiments: ExperimentWithVariants[] = [
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }]),
        { slug: "another-exp", label: null, description: null, status: "DRAFT", winner: null, variants: [] },
      ];
      vi.mocked(mockRepo.findAll).mockResolvedValue(experiments);

      const configs = await service.getAllConfigs();

      expect(configs).toHaveLength(2);
      expect(configs[0].slug).toBe("upgrade-dialog-try-cta");
      expect(configs[1].slug).toBe("another-exp");
    });
  });

  describe("updateStatus", () => {
    it("throws NotFound when experiment does not exist", async () => {
      await expect(service.updateStatus({ slug: "nonexistent", status: "RUNNING", userId: 1 })).rejects.toThrow(
        ErrorWithCode
      );
    });

    it("updates status when experiment exists", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }])
      );

      await service.updateStatus({ slug: "upgrade-dialog-try-cta", status: "STOPPED", userId: 1 });

      expect(mockRepo.updateStatus).toHaveBeenCalledWith({
        slug: "upgrade-dialog-try-cta",
        status: "STOPPED",
        userId: 1,
      });
    });
  });

  describe("updateVariantWeight", () => {
    it("throws NotFound when experiment does not exist", async () => {
      await expect(
        service.updateVariantWeight({ experimentSlug: "nonexistent", variantSlug: "variant_a", weight: 50, userId: 1 })
      ).rejects.toThrow(ErrorWithCode);
    });

    it("throws BadRequest when weight is negative", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }])
      );

      await expect(
        service.updateVariantWeight({
          experimentSlug: "upgrade-dialog-try-cta",
          variantSlug: "try_cta",
          weight: -1,
          userId: 1,
        })
      ).rejects.toThrow(ErrorWithCode);
    });

    it("throws BadRequest when weight exceeds 100", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }])
      );

      await expect(
        service.updateVariantWeight({
          experimentSlug: "upgrade-dialog-try-cta",
          variantSlug: "try_cta",
          weight: 101,
          userId: 1,
        })
      ).rejects.toThrow(ErrorWithCode);
    });

    it("throws BadRequest when total variant weights exceed 100", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("billing-upgrade-cta", [
          { variantSlug: "variant_a", label: null, weight: 60 },
          { variantSlug: "variant_b", label: null, weight: 30 },
        ])
      );

      await expect(
        service.updateVariantWeight({
          experimentSlug: "billing-upgrade-cta",
          variantSlug: "variant_a",
          weight: 80,
          userId: 1,
        })
      ).rejects.toThrow(ErrorWithCode);
    });

    it("updates weight when experiment exists and weight is valid", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }])
      );

      await service.updateVariantWeight({
        experimentSlug: "upgrade-dialog-try-cta",
        variantSlug: "try_cta",
        weight: 75,
        userId: 1,
      });

      expect(mockRepo.updateVariantWeight).toHaveBeenCalledWith({
        experimentSlug: "upgrade-dialog-try-cta",
        variantSlug: "try_cta",
        weight: 75,
        userId: 1,
      });
    });
  });

  describe("setWinner", () => {
    it("throws NotFound when experiment does not exist", async () => {
      await expect(
        service.setWinner({ slug: "nonexistent", variantSlug: "variant_a", userId: 1 })
      ).rejects.toThrow(ErrorWithCode);
    });

    it("sets winner when experiment exists", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }])
      );

      await service.setWinner({ slug: "upgrade-dialog-try-cta", variantSlug: "try_cta", userId: 1 });

      expect(mockRepo.setWinner).toHaveBeenCalledWith({
        slug: "upgrade-dialog-try-cta",
        variantSlug: "try_cta",
        userId: 1,
      });
    });

    it("sets null winner (control wins) when experiment exists", async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(
        runningExperiment("upgrade-dialog-try-cta", [{ variantSlug: "try_cta", label: null, weight: 50 }])
      );

      await service.setWinner({ slug: "upgrade-dialog-try-cta", variantSlug: null, userId: 1 });

      expect(mockRepo.setWinner).toHaveBeenCalledWith({
        slug: "upgrade-dialog-try-cta",
        variantSlug: null,
        userId: 1,
      });
    });
  });
});
