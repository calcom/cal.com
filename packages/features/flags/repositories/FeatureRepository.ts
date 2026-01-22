import { Memoize } from "@calcom/features/cache";
import type { FeatureDto } from "@calcom/lib/dto/FeatureDto";
import { FeatureDtoArraySchema } from "@calcom/lib/dto/FeatureDto";
import type { PrismaClient } from "@calcom/prisma/client";

import type { AppFlags, FeatureId } from "../config";

const CACHE_PREFIX = "features:global";
const KEY = {
  all: (): string => `${CACHE_PREFIX}:all`,
};

export interface IFeatureRepository {
  findAll(): Promise<FeatureDto[]>;
  checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean>;
  getFeatureFlagMap(): Promise<AppFlags>;
}

export class FeatureRepository implements IFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  @Memoize({
    key: () => KEY.all(),
    schema: FeatureDtoArraySchema,
  })
  async findAll(): Promise<FeatureDto[]> {
    const features = await this.prisma.feature.findMany({
      orderBy: { slug: "asc" },
    });
    return features.map((f) => ({
      slug: f.slug,
      enabled: f.enabled,
      description: f.description,
      type: f.type,
      stale: f.stale,
      lastUsedAt: f.lastUsedAt,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      updatedBy: f.updatedBy,
    }));
  }

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    const features = await this.findAll();
    const flag = features.find((f) => f.slug === slug);
    return Boolean(flag && flag.enabled);
  }

  async getFeatureFlagMap(): Promise<AppFlags> {
    const flags = await this.findAll();
    return flags.reduce((acc, flag) => {
      acc[flag.slug as FeatureId] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }
}
