import { Memoize } from "@calcom/features/cache";
import type { Feature, PrismaClient } from "@calcom/prisma/client";
import { featureArraySchema } from "./schemas";

const CACHE_PREFIX = "features:global";
const KEY = {
  all: (): string => `${CACHE_PREFIX}:all`,
};

export interface IFeatureRepository {
  findAll(): Promise<Feature[]>;
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
}
