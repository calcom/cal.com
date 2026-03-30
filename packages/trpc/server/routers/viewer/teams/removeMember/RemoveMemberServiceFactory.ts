import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import { getTeamRepository } from "@calcom/features/di/containers/TeamRepository";
import type { IRemoveMemberService } from "./IRemoveMemberService";
import { LegacyRemoveMemberService } from "./LegacyRemoveMemberService";
import { PBACRemoveMemberService } from "./PBACRemoveMemberService";

export class RemoveMemberServiceFactory {
  /**
   * Creates the appropriate RemoveMemberService based on whether PBAC is enabled
   * Caches the service per team/org to avoid repeated feature flag checks
   */
  static async create(teamId: number): Promise<IRemoveMemberService> {
    const teamFeatureRepository = getTeamFeatureRepository();
    const isPBACEnabled = await teamFeatureRepository.checkIfTeamHasFeature(teamId, "pbac");

    const teamRepository = getTeamRepository();
    const service = isPBACEnabled
      ? new PBACRemoveMemberService()
      : new LegacyRemoveMemberService(teamRepository);

    return service;
  }
}
