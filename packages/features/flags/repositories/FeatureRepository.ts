import type { Feature, PrismaClient } from "@calcom/prisma/client";
import { Memoize } from "../../cache/decorators/Memoize";
import type { AppFlags, FeatureId } from "../config";
import { appFlagsSchema, featureArraySchema, featureSchema } from "./schemas";

const CACHE_PREFIX = "features:global";
const KEY = {
  all: (): string => `${CACHE_PREFIX}:all`,
  bySlug: (slug: string): string => `${CACHE_PREFIX}:${slug}`,
  flagMap: (): string => `${CACHE_PREFIX}:flagMap`,
};

export interface IFeatureRepository {
  findAll(): Promise<Feature[]>;
  findBySlug(slug: FeatureId): Promise<Feature | null>;
  checkIfEnabledGlobally(slug: FeatureId): Promise<boolean>;
  getFeatureFlagMap(): Promise<AppFlags>;
}

export class FeatureRepository implements IFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  @Memoize({
    key: () => KEY.all(),
    schema: featureArraySchema,
  })
  async findAll(): Promise<Feature[]> {
    return this.prisma.feature.findMany({
      orderBy: { slug: "asc" },
    });
  }

  @Memoize({
    key: (slug: FeatureId) => KEY.bySlug(slug),
    schema: featureSchema,
  })
  async findBySlug(slug: FeatureId): Promise<Feature | null> {
    return this.prisma.feature.findUnique({
      where: { slug },
    });
  }

  async checkIfEnabledGlobally(slug: FeatureId): Promise<boolean> {
    const feature = await this.findBySlug(slug);
    return Boolean(feature?.enabled);
  }

  @Memoize({
    key: () => KEY.flagMap(),
    schema: appFlagsSchema,
  })
  async getFeatureFlagMap(): Promise<AppFlags> {
    const flags = await this.prisma.feature.findMany({
      orderBy: { slug: "asc" },
      select: { slug: true, enabled: true },
    });
    return flags.reduce((acc, flag) => {
      acc[flag.slug as FeatureId] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }
}
