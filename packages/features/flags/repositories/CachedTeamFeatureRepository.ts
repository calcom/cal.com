import { z } from "zod";

import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { TeamFeaturesDto } from "@calcom/lib/dto/TeamFeaturesDto";
import { TeamFeaturesDtoSchema } from "@calcom/lib/dto/TeamFeaturesDto";

import type { FeatureId, TeamFeatures } from "../config";
import type { ITeamFeatureRepository } from "./PrismaTeamFeatureRepository";
import { booleanSchema } from "./schemas";

const CACHE_PREFIX = "features:team";
const KEY = {
  byTeamIdAndFeatureId: (teamId: number, featureId: string): string =>
    `${CACHE_PREFIX}:${teamId}:${featureId}`,
  autoOptInByTeamId: (teamId: number): string => `${CACHE_PREFIX}:autoOptIn:${teamId}`,
  enabledFeatures: (teamId: number): string => `${CACHE_PREFIX}:enabledFeatures:${teamId}`,
};

const teamFeaturesSchema = z.record(z.string(), z.boolean()).nullable();

export class CachedTeamFeatureRepository implements ITeamFeatureRepository {
  constructor(private prismaTeamFeatureRepository: ITeamFeatureRepository) {}

  @Memoize({
    key: KEY.byTeamIdAndFeatureId,
    schema: TeamFeaturesDtoSchema,
  })
  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeaturesDto | null> {
    return this.prismaTeamFeatureRepository.findByTeamIdAndFeatureId(teamId, featureId);
  }

  async findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>>> {
    return this.prismaTeamFeatureRepository.findByTeamIdsAndFeatureIds(teamIds, featureIds);
  }

  @Unmemoize({
    keys: (teamId: number, featureId: FeatureId) => [
      KEY.byTeamIdAndFeatureId(teamId, featureId),
      KEY.enabledFeatures(teamId),
    ],
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
    keys: (teamId: number, featureId: FeatureId) => [
      KEY.byTeamIdAndFeatureId(teamId, featureId),
      KEY.enabledFeatures(teamId),
    ],
  })
  async delete(teamId: number, featureId: FeatureId): Promise<void> {
    return this.prismaTeamFeatureRepository.delete(teamId, featureId);
  }

  @Memoize({
    key: KEY.autoOptInByTeamId,
    schema: booleanSchema,
  })
  async findAutoOptInByTeamId(teamId: number): Promise<boolean> {
    return this.prismaTeamFeatureRepository.findAutoOptInByTeamId(teamId);
  }

  async findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>> {
    return this.prismaTeamFeatureRepository.findAutoOptInByTeamIds(teamIds);
  }

  @Unmemoize({
    keys: (teamId: number) => [KEY.autoOptInByTeamId(teamId)],
  })
  async setAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    return this.prismaTeamFeatureRepository.setAutoOptIn(teamId, enabled);
  }

  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
    return this.prismaTeamFeatureRepository.checkIfTeamHasFeature(teamId, featureId);
  }

  @Memoize({
    key: KEY.enabledFeatures,
    schema: teamFeaturesSchema,
  })
  async getEnabledFeatures(teamId: number): Promise<TeamFeatures | null> {
    return this.prismaTeamFeatureRepository.getEnabledFeatures(teamId);
  }
}
