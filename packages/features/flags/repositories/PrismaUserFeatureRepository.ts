import type { UserFeaturesDto } from "@calcom/lib/dto/UserFeaturesDto";
import type { PrismaClient } from "@calcom/prisma/client";
import type { FeatureId } from "../config";

export interface IUserFeatureRepository {
  findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeaturesDto | null>;
  findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, UserFeaturesDto>>>;
  upsert(
    userId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<UserFeaturesDto>;
  delete(userId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean>;
  setAutoOptIn(userId: number, enabled: boolean): Promise<void>;
}

export class PrismaUserFeatureRepository implements IUserFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeaturesDto | null> {
    const result = await this.prisma.userFeatures.findUnique({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
    });
    if (!result) return null;
    return this.toDto(result);
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, UserFeaturesDto>>> {
    const results = await Promise.all(
      featureIds.map(async (featureId) => {
        const userFeature = await this.findByUserIdAndFeatureId(userId, featureId);
        return { featureId, userFeature };
      })
    );

    const result: Partial<Record<FeatureId, UserFeaturesDto>> = {};
    for (const { featureId, userFeature } of results) {
      if (userFeature !== null) {
        result[featureId] = userFeature;
      }
    }

    return result;
  }

  async upsert(
    userId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<UserFeaturesDto> {
    const result = await this.prisma.userFeatures.upsert({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
      create: {
        userId,
        featureId,
        enabled,
        assignedBy,
      },
      update: {
        enabled,
        assignedBy,
      },
    });
    return this.toDto(result);
  }

  private toDto(userFeature: {
    userId: number;
    featureId: string;
    enabled: boolean;
    assignedBy: string;
    updatedAt: Date;
  }): UserFeaturesDto {
    return {
      userId: userFeature.userId,
      featureId: userFeature.featureId,
      enabled: userFeature.enabled,
      assignedBy: userFeature.assignedBy,
      updatedAt: userFeature.updatedAt,
    };
  }

  async delete(userId: number, featureId: FeatureId): Promise<void> {
    await this.prisma.userFeatures.delete({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
    });
  }

  async findAutoOptInByUserId(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autoOptInFeatures: true },
    });
    return user?.autoOptInFeatures ?? false;
  }

  async setAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { autoOptInFeatures: enabled },
    });
  }
}
