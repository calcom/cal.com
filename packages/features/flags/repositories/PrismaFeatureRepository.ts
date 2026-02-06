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
    return this.prisma.feature.findMany({
      orderBy: { slug: "asc" },
      select: {
        slug: true,
        enabled: true,
        description: true,
        type: true,
        stale: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        updatedBy: true,
      },
    });
  }

  async findBySlug(slug: string): Promise<FeatureDto | null> {
    return this.prisma.feature.findUnique({
      where: { slug },
      select: {
        slug: true,
        enabled: true,
        description: true,
        type: true,
        stale: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        updatedBy: true,
      },
    });
  }

  async update(input: { featureId: FeatureId; enabled: boolean; updatedBy?: number }): Promise<FeatureDto> {
    const { featureId, enabled, updatedBy } = input;
    return this.prisma.feature.update({
      where: { slug: featureId },
      data: { enabled, updatedBy, updatedAt: new Date() },
      select: {
        slug: true,
        enabled: true,
        description: true,
        type: true,
        stale: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        updatedBy: true,
      },
    });
  }
}
