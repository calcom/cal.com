import { createFeaturesService } from "@calcom/features/flags/features.service.factory";

import type { IRemoveMemberService } from "./IRemoveMemberService";
import { LegacyRemoveMemberService } from "./LegacyRemoveMemberService";
import { PBACRemoveMemberService } from "./PBACRemoveMemberService";

export class RemoveMemberServiceFactory {
  /**
   * Creates the appropriate RemoveMemberService based on whether PBAC is enabled
   * Caches the service per team/org to avoid repeated feature flag checks
   */
  static async create(teamId: number): Promise<IRemoveMemberService> {
    const featuresService = createFeaturesService();
    const isPBACEnabled = await featuresService.checkIfTeamHasFeature(teamId, "pbac");

    const service = isPBACEnabled ? new PBACRemoveMemberService() : new LegacyRemoveMemberService();

    return service;
  }
}
