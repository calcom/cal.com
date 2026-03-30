import { Memoize, Unmemoize } from "@calcom/features/cache";
import { ExperimentWithVariantsArraySchema, ExperimentWithVariantsSchema } from "../types";
import type {
  ExperimentWithVariants,
  IExperimentRepository,
  SetWinnerInput,
  UpdateStatusInput,
  UpdateVariantWeightInput,
} from "./IExperimentRepository";

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
    keys: ({ slug }: UpdateStatusInput) => [KEY.bySlug(slug), KEY.allRunning(), KEY.all()],
  })
  async updateStatus(input: UpdateStatusInput): Promise<void> {
    return this.prismaExperimentRepository.updateStatus(input);
  }

  @Unmemoize({
    keys: ({ experimentSlug }: UpdateVariantWeightInput) => [
      KEY.bySlug(experimentSlug),
      KEY.allRunning(),
      KEY.all(),
    ],
  })
  async updateVariantWeight(input: UpdateVariantWeightInput): Promise<void> {
    return this.prismaExperimentRepository.updateVariantWeight(input);
  }

  @Unmemoize({
    keys: ({ slug }: SetWinnerInput) => [KEY.bySlug(slug), KEY.allRunning(), KEY.all()],
  })
  async setWinner(input: SetWinnerInput): Promise<void> {
    return this.prismaExperimentRepository.setWinner(input);
  }
}
