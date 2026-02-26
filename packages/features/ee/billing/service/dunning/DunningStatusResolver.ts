import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import type { DunningStatus } from "@calcom/prisma/client";

import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import type { IDunningService } from "./IDunningService";

const SEVERITY: Record<DunningStatus, number> = {
  CURRENT: 0,
  WARNING: 1,
  SOFT_BLOCKED: 2,
  HARD_BLOCKED: 3,
  CANCELLED: 4,
};

export interface IDunningStatusResolverDeps {
  teamDunningService: IDunningService;
  orgDunningService: IDunningService;
  teamRepository: TeamRepository;
  teamBillingRepository: IBillingRepository;
  orgBillingRepository: IBillingRepository;
}

export class DunningStatusResolver {
  constructor(private deps: IDunningStatusResolverDeps) {}

  async getEffectiveStatus(teamId: number): Promise<DunningStatus> {
    const teamBillingId = await this.deps.teamBillingRepository.findByTeamId(teamId);
    const teamStatus = teamBillingId
      ? await this.deps.teamDunningService.getStatus(teamBillingId)
      : "CURRENT";

    const parent = await this.deps.teamRepository.findParentOrganizationByTeamId(teamId);
    if (!parent) return teamStatus;

    const orgBillingId = await this.deps.orgBillingRepository.findByTeamId(parent.id);
    const orgStatus = orgBillingId
      ? await this.deps.orgDunningService.getStatus(orgBillingId)
      : "CURRENT";

    return SEVERITY[orgStatus] > SEVERITY[teamStatus] ? orgStatus : teamStatus;
  }
}
