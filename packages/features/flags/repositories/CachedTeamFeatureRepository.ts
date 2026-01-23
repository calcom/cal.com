import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { TeamFeaturesDto } from "@calcom/lib/dto/TeamFeaturesDto";
import { TeamFeaturesDtoSchema } from "@calcom/lib/dto/TeamFeaturesDto";
import type { FeatureId } from "../config";
import type { ITeamFeatureRepository } from "./PrismaTeamFeatureRepository";
import { booleanSchema } from "./schemas";

const CACHE_PREFIX = "features:team";
const KEY = {
  byTeamIdAndFeatureId: (teamId: number, featureId: string): string =>
    `${CACHE_PREFIX}:${teamId}:${featureId}`,
  autoOptInByTeamId: (teamId: number): string => `${CACHE_PREFIX}:autoOptIn:${teamId}`,
};

export class CachedTeamFeatureRepository implements ITeamFeatureRepository {
  constructor(private prismaTeamFeatureRepository: ITeamFeatureRepository) {}

  @Memoize({
    key: (teamId: number, featureId: FeatureId) => KEY.byTeamIdAndFeatureId(teamId, featureId),
    schema: TeamFeaturesDtoSchema,
  })
  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeaturesDto | null> {
    return this.prismaTeamFeatureRepository.findByTeamIdAndFeatureId(teamId, featureId);
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

  @Unmemoize({
    keys: (teamId: number, featureId: FeatureId) => [KEY.byTeamIdAndFeatureId(teamId, featureId)],
  })
  async upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeaturesDto> {
    return this.prismaTeamFeatureRepository.upsert(teamId, featureId, enabled, assignedBy);
  }

  @Unmemoize({
    keys: (teamId: number, featureId: FeatureId) => [KEY.byTeamIdAndFeatureId(teamId, featureId)],
  })
  async delete(teamId: number, featureId: FeatureId): Promise<void> {
    return this.prismaTeamFeatureRepository.delete(teamId, featureId);
  }

  @Memoize({
    key: (teamId: number) => KEY.autoOptInByTeamId(teamId),
    schema: booleanSchema,
  })
  async findAutoOptInByTeamId(teamId: number): Promise<boolean> {
    return this.prismaTeamFeatureRepository.findAutoOptInByTeamId(teamId);
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

  @Unmemoize({
    keys: (teamId: number) => [KEY.autoOptInByTeamId(teamId)],
  })
  async setAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    return this.prismaTeamFeatureRepository.setAutoOptIn(teamId, enabled);
  }
}
