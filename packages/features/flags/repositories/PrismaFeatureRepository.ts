import type { Feature, PrismaClient } from "@calcom/prisma/client";

import type { AppFlags, FeatureId } from "../config";

export interface IPrismaFeatureRepository {
  findAll(): Promise<Feature[]>;
  findBySlug(slug: FeatureId): Promise<Feature | null>;
  checkIfEnabledGlobally(slug: FeatureId): Promise<boolean>;
  getFeatureFlagMap(): Promise<AppFlags>;
}

export class PrismaFeatureRepository implements IPrismaFeatureRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findAll(): Promise<Feature[]> {
    return this.prismaClient.feature.findMany({
      orderBy: { slug: "asc" },
    });
  }

  async findBySlug(slug: FeatureId): Promise<Feature | null> {
    return this.prismaClient.feature.findUnique({
      where: { slug },
    });
  }

  async checkIfEnabledGlobally(slug: FeatureId): Promise<boolean> {
    const feature = await this.prismaClient.feature.findUnique({
      where: { slug },
      select: { enabled: true },
    });
    return Boolean(feature?.enabled);
  }

  async getFeatureFlagMap(): Promise<AppFlags> {
    const flags = await this.prismaClient.feature.findMany({
      orderBy: { slug: "asc" },
      select: { slug: true, enabled: true },
    });
    return flags.reduce((acc, flag) => {
      acc[flag.slug as FeatureId] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }
}
