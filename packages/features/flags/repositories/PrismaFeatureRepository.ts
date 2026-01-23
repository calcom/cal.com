import type { FeatureId } from "@calcom/features/flags/config";
import type { FeatureDto } from "@calcom/lib/dto/FeatureDto";
import type { PrismaClient } from "@calcom/prisma/client";

export interface IFeatureRepository {
  findAll(): Promise<FeatureDto[]>;
  findBySlug(slug: string): Promise<FeatureDto | null>;
  update(input: { featureId: FeatureId; enabled: boolean; updatedBy?: number }): Promise<FeatureDto>;
}

export class PrismaFeatureRepository implements IFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

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

  async findBySlug(slug: string): Promise<FeatureDto | null> {
    const feature = await this.prisma.feature.findUnique({
      where: { slug },
    });
    if (!feature) return null;
    return {
      slug: feature.slug,
      enabled: feature.enabled,
      description: feature.description,
      type: feature.type,
      stale: feature.stale,
      lastUsedAt: feature.lastUsedAt,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
      updatedBy: feature.updatedBy,
    };
  }

  async update(input: { featureId: FeatureId; enabled: boolean; updatedBy?: number }): Promise<FeatureDto> {
    const { featureId, enabled, updatedBy } = input;
    const feature = await this.prisma.feature.update({
      where: { slug: featureId },
      data: { enabled, updatedBy },
    });
    return {
      slug: feature.slug,
      enabled: feature.enabled,
      description: feature.description,
      type: feature.type,
      stale: feature.stale,
      lastUsedAt: feature.lastUsedAt,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
      updatedBy: feature.updatedBy,
    };
  }
}
