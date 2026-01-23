import { Memoize } from "@calcom/features/cache";
import type { FeatureDto } from "@calcom/lib/dto/FeatureDto";
import { FeatureDtoArraySchema } from "@calcom/lib/dto/FeatureDto";
import type { IFeatureRepository } from "./PrismaFeatureRepository";

const CACHE_PREFIX = "features:global";
const KEY = {
  all: (): string => `${CACHE_PREFIX}:all`,
};

export class CachedFeatureRepository implements IFeatureRepository {
  constructor(private prismaFeatureRepository: IFeatureRepository) {}

  @Memoize({
    key: () => KEY.all(),
    schema: FeatureDtoArraySchema,
  })
  async findAll(): Promise<FeatureDto[]> {
    return this.prismaFeatureRepository.findAll();
  }
}
