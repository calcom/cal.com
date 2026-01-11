import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

import type { IRemoveMemberService } from "./IRemoveMemberService";
import { LegacyRemoveMemberService } from "./LegacyRemoveMemberService";
import { PBACRemoveMemberService } from "./PBACRemoveMemberService";

export class RemoveMemberServiceFactory {
  /**
   * Creates the appropriate RemoveMemberService based on whether PBAC is enabled
   * Caches the service per team/org to avoid repeated feature flag checks
   */
  static async create(teamId: number): Promise<IRemoveMemberService> {
    const featuresRepository = new FeaturesRepository(prisma);
    const isPBACEnabled = await featuresRepository.checkIfTeamHasFeature(teamId, "pbac");

    const service = isPBACEnabled ? new PBACRemoveMemberService() : new LegacyRemoveMemberService();

    return service;
  }
}
