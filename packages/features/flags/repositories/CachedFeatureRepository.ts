import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { FeatureId } from "@calcom/features/flags/config";
import type { FeatureDto } from "@calcom/lib/dto/FeatureDto";
import { FeatureDtoArraySchema, FeatureDtoSchema } from "@calcom/lib/dto/FeatureDto";
import type { IFeatureRepository } from "./PrismaFeatureRepository";

const CACHE_PREFIX = "features:global";
const KEY = {
  all: (): string => `${CACHE_PREFIX}:all`,
  bySlug: (slug: string): string => `${CACHE_PREFIX}:slug:${slug}`,
};

export class CachedFeatureRepository implements IFeatureRepository {
  constructor(private prismaFeatureRepository: IFeatureRepository) {}

  @Memoize({
    key: KEY.all,
    schema: FeatureDtoArraySchema,
  })
  async findAll(): Promise<FeatureDto[]> {
    return this.prismaFeatureRepository.findAll();
  }

  @Memoize({
    key: KEY.bySlug,
    schema: FeatureDtoSchema.nullable(),
  })
  async findBySlug(slug: string): Promise<FeatureDto | null> {
    return this.prismaFeatureRepository.findBySlug(slug);
  }

  @Unmemoize({
    keys: (input: { featureId: FeatureId }) => [KEY.bySlug(input.featureId), KEY.all()],
  })
  async update(input: { featureId: FeatureId; enabled: boolean; updatedBy?: number }): Promise<FeatureDto> {
    return this.prismaFeatureRepository.update(input);
  }

  /**
   * Checks if a feature is enabled globally in the application.
   * Uses the cached findBySlug method to avoid hitting the database on every request.
   * @param slug - The feature flag identifier to check
   * @returns Promise<boolean> - True if the feature is enabled globally, false otherwise
   */
  async checkIfFeatureIsEnabledGlobally(slug: string): Promise<boolean> {
    const feature = await this.findBySlug(slug);
    return Boolean(feature && feature.enabled);
  }

  /**
   * Gets a map of all feature flags and their enabled status.
   * Uses caching to avoid hitting the database on every request.
   * @returns Promise<AppFlags> - A map of feature flags to their enabled status
   */
  public async getFeatureFlagMap() {
    const flags = await this.findAll();
    return flags.reduce(
      (acc, flag) => {
        acc[flag.slug as FeatureId] = flag.enabled;
        return acc;
      },
      {} as Record<string, boolean>
    );
  }
}
