import type {
  FeatureId,
  IFeatureRepository,
  ITeamFeatureRepository,
  IUserFeatureRepository,
} from "@calcom/platform-libraries/repositories";
import {
  getFeatureRepository,
  getTeamFeatureRepository,
  getUserFeatureRepository,
} from "@calcom/platform-libraries/repositories";
import { Injectable } from "@nestjs/common";

/**
 * NestJS injectable wrapper that delegates to the new split DI feature repositories.
 * Preserves the same public API so that existing NestJS services can continue
 * injecting PrismaFeaturesRepository without changes.
 */
@Injectable()
export class PrismaFeaturesRepository {
  private featureRepo: IFeatureRepository;
  private teamFeatureRepo: ITeamFeatureRepository;
  private userFeatureRepo: IUserFeatureRepository;

  constructor() {
    this.featureRepo = getFeatureRepository();
    this.teamFeatureRepo = getTeamFeatureRepository();
    this.userFeatureRepo = getUserFeatureRepository();
  }

  async checkIfFeatureIsEnabledGlobally(slug: string): Promise<boolean> {
    return this.featureRepo.checkIfFeatureIsEnabledGlobally(slug);
  }

  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
    return this.teamFeatureRepo.checkIfTeamHasFeature(teamId, featureId);
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    return this.userFeatureRepo.checkIfUserHasFeature(userId, slug);
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    return this.userFeatureRepo.checkIfUserHasFeatureNonHierarchical(userId, slug);
  }
}
