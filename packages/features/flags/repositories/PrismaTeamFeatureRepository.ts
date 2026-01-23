import type { TeamFeaturesDto } from "@calcom/lib/dto/TeamFeaturesDto";
import type { PrismaClient } from "@calcom/prisma/client";
import type { FeatureId } from "../config";

export interface ITeamFeatureRepository {
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeaturesDto | null>;
  findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>>>;
  upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeaturesDto>;
  delete(teamId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByTeamId(teamId: number): Promise<boolean>;
  findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>>;
  setAutoOptIn(teamId: number, enabled: boolean): Promise<void>;
}

export class PrismaTeamFeatureRepository implements ITeamFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeaturesDto | null> {
    const result = await this.prisma.teamFeatures.findUnique({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
    });
    if (!result) return null;
    return this.toDto(result);
  }

  async findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>>> {
    if (teamIds.length === 0 || featureIds.length === 0) {
      return {};
    }

    const results = await Promise.all(
      teamIds.flatMap((teamId) =>
        featureIds.map(async (featureId) => {
          const teamFeature = await this.findByTeamIdAndFeatureId(teamId, featureId);
          return { teamId, featureId, teamFeature };
        })
      )
    );

    const result: Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>> = {};
    for (const { teamId, featureId, teamFeature } of results) {
      if (teamFeature !== null) {
        if (!result[featureId]) {
          result[featureId] = {};
        }
        const featureRecord = result[featureId];
        if (featureRecord) {
          featureRecord[teamId] = teamFeature;
        }
      }
    }

    return result;
  }

  async upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeaturesDto> {
    const result = await this.prisma.teamFeatures.upsert({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
      create: {
        teamId,
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

  private toDto(teamFeature: {
    teamId: number;
    featureId: string;
    enabled: boolean;
    assignedBy: string;
    updatedAt: Date;
  }): TeamFeaturesDto {
    return {
      teamId: teamFeature.teamId,
      featureId: teamFeature.featureId,
      enabled: teamFeature.enabled,
      assignedBy: teamFeature.assignedBy,
      updatedAt: teamFeature.updatedAt,
    };
  }

  async delete(teamId: number, featureId: FeatureId): Promise<void> {
    await this.prisma.teamFeatures.delete({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
    });
  }

  async findAutoOptInByTeamId(teamId: number): Promise<boolean> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { autoOptInFeatures: true },
    });
    return team?.autoOptInFeatures ?? false;
  }

  async findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>> {
    if (teamIds.length === 0) {
      return {};
    }

    const results = await Promise.all(
      teamIds.map(async (teamId) => {
        const autoOptIn = await this.findAutoOptInByTeamId(teamId);
        return { teamId, autoOptIn };
      })
    );

    const result: Record<number, boolean> = {};
    for (const { teamId, autoOptIn } of results) {
      result[teamId] = autoOptIn;
    }
    return result;
  }

  async setAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.prisma.team.update({
      where: { id: teamId },
      data: { autoOptInFeatures: enabled },
    });
  }
}
