import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import type { AppFlags } from "@calcom/features/flags/config";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

@Injectable()
export class PrismaFeaturesRepository implements IFeaturesRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {}

  async checkIfTeamHasFeature(teamId: number, featureId: keyof AppFlags): Promise<boolean> {
    const prisma = this.dbWrite.prisma;

    const teamHasFeature = await prisma.teamFeatures.findUnique({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
    });

    return Boolean(teamHasFeature);
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const prisma = this.dbWrite.prisma;

    const userHasFeature = await prisma.userFeatures.findFirst({
      where: {
        userId,
        featureId: slug,
      },
    });

    return Boolean(userHasFeature);
  }

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const prisma = this.dbWrite.prisma;

    const feature = await prisma.feature.findUnique({
      where: { slug },
      select: { enabled: true },
    });

    return Boolean(feature?.enabled);
  }

  async getFeatureFlagMap(): Promise<AppFlags> {
    const prisma = this.dbWrite.prisma;

    const features = await prisma.feature.findMany({
      select: { slug: true, enabled: true },
    });

    return features.reduce((acc, feature) => {
      acc[feature.slug as keyof AppFlags] = feature.enabled;
      return acc;
    }, {} as AppFlags);
  }

  async getAllFeatures() {
    const prisma = this.dbWrite.prisma;

    return await prisma.feature.findMany({
      orderBy: { slug: "asc" },
    });
  }

  async getTeamFeatures(teamId: number) {
    const prisma = this.dbWrite.prisma;

    const result = await prisma.teamFeatures.findMany({
      where: { teamId },
      include: {
        feature: {
          select: { slug: true, enabled: true },
        },
      },
    });

    if (!result.length) return null;

    return Object.fromEntries(result.map((teamFeature) => [teamFeature.feature.slug, true]));
  }
}
