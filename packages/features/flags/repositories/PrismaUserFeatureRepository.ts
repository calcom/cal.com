import type { PrismaClient, UserFeatures } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import type { FeatureId, FeatureState } from "../config";

export interface IPrismaUserFeatureRepository {
  findByUserId(userId: number): Promise<UserFeatures[]>;
  findByUserIdAndFeatureId(userId: number, featureId: string): Promise<UserFeatures | null>;
  findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>>>;
  checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  upsert(userId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<UserFeatures>;
  delete(userId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean>;
  updateAutoOptIn(userId: number, enabled: boolean): Promise<void>;
}

export class PrismaUserFeatureRepository implements IPrismaUserFeatureRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findByUserId(userId: number): Promise<UserFeatures[]> {
    return this.prismaClient.userFeatures.findMany({
      where: { userId },
    });
  }

  async findByUserIdAndFeatureId(userId: number, featureId: string): Promise<UserFeatures | null> {
    return this.prismaClient.userFeatures.findFirst({
      where: {
        userId,
        featureId,
      },
    });
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>>> {
    const result: Partial<Record<FeatureId, FeatureState>> = {};
    for (const featureId of featureIds) {
      result[featureId] = "inherit";
    }

    const userFeatures = await this.prismaClient.userFeatures.findMany({
      where: {
        userId,
        featureId: { in: featureIds },
      },
      select: { featureId: true, enabled: true },
    });

    for (const userFeature of userFeatures) {
      result[userFeature.featureId as FeatureId] = userFeature.enabled ? "enabled" : "disabled";
    }

    return result;
  }

  async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean> {
    const query = Prisma.sql`
      WITH RECURSIVE TeamHierarchy AS (
        SELECT DISTINCT t.id, t."parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = t.id AND tf."featureId" = ${slug} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team" t
        INNER JOIN "Membership" m ON m."teamId" = t.id
        WHERE m."userId" = ${userId} AND m.accepted = true

        UNION ALL

        SELECT DISTINCT p.id, p."parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = p.id AND tf."featureId" = ${slug} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team" p
        INNER JOIN TeamHierarchy c ON p.id = c."parentId"
        WHERE NOT c.has_feature
      )
      SELECT 1
      FROM TeamHierarchy
      WHERE has_feature = true
      LIMIT 1;
    `;

    const result = await this.prismaClient.$queryRaw<unknown[]>(query);
    return result.length > 0;
  }

  async checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const query = Prisma.sql`
      SELECT 1
      FROM "Team" t
      INNER JOIN "Membership" m ON m."teamId" = t.id
      WHERE m."userId" = ${userId}
        AND m.accepted = true
        AND EXISTS (
          SELECT 1
          FROM "TeamFeatures" tf
          WHERE tf."teamId" = t.id
            AND tf."featureId" = ${slug}
            AND tf."enabled" = true
        )
      LIMIT 1;
    `;

    const result = await this.prismaClient.$queryRaw<unknown[]>(query);
    return result.length > 0;
  }

  async upsert(
    userId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<UserFeatures> {
    return this.prismaClient.userFeatures.upsert({
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
  }

  async delete(userId: number, featureId: FeatureId): Promise<void> {
    await this.prismaClient.userFeatures.deleteMany({
      where: {
        userId,
        featureId,
      },
    });
  }

  async findAutoOptInByUserId(userId: number): Promise<boolean> {
    const user = await this.prismaClient.user.findUnique({
      where: { id: userId },
      select: { autoOptInFeatures: true },
    });
    return user?.autoOptInFeatures ?? false;
  }

  async updateAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.prismaClient.user.update({
      where: { id: userId },
      data: { autoOptInFeatures: enabled },
    });
  }
}
