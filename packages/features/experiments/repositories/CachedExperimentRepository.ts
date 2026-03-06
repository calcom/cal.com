import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { ExperimentStatusType } from "../types";
import { ExperimentWithVariantsArraySchema, ExperimentWithVariantsSchema } from "../types";
import type { ExperimentWithVariants, IExperimentRepository } from "./IExperimentRepository";

const CACHE_PREFIX = "experiments";
const KEY = {
  bySlug: (slug: string): string => `${CACHE_PREFIX}:slug:${slug}`,
  allRunning: (): string => `${CACHE_PREFIX}:running`,
  all: (): string => `${CACHE_PREFIX}:all`,
};

export class CachedExperimentRepository implements IExperimentRepository {
  constructor(private prismaExperimentRepository: IExperimentRepository) {}

  @Memoize({
    key: KEY.bySlug,
    schema: ExperimentWithVariantsSchema.nullable(),
  })
  async findBySlug(slug: string): Promise<ExperimentWithVariants | null> {
    return this.prismaExperimentRepository.findBySlug(slug);
  }

  @Memoize({
    key: KEY.allRunning,
    schema: ExperimentWithVariantsArraySchema,
  })
  async findAllRunning(): Promise<ExperimentWithVariants[]> {
    return this.prismaExperimentRepository.findAllRunning();
  }

  @Memoize({
    key: KEY.all,
    schema: ExperimentWithVariantsArraySchema,
  })
  async findAll(): Promise<ExperimentWithVariants[]> {
    return this.prismaExperimentRepository.findAll();
  }

  @Unmemoize({
    keys: (slug: string) => [KEY.bySlug(slug), KEY.allRunning(), KEY.all()],
  })
  async updateStatus(slug: string, status: ExperimentStatusType, now?: Date): Promise<void> {
    return this.prismaExperimentRepository.updateStatus(slug, status, now);
  }

  @Unmemoize({
    keys: (experimentSlug: string) => [KEY.bySlug(experimentSlug), KEY.allRunning(), KEY.all()],
  })
  async updateVariantWeight(experimentSlug: string, variantSlug: string, weight: number): Promise<void> {
    return this.prismaExperimentRepository.updateVariantWeight(experimentSlug, variantSlug, weight);
  }

  @Unmemoize({
    keys: (slug: string) => [KEY.bySlug(slug), KEY.allRunning(), KEY.all()],
  })
  async setWinner(slug: string, variantSlug: string | null): Promise<void> {
    return this.prismaExperimentRepository.setWinner(slug, variantSlug);
  }
}
