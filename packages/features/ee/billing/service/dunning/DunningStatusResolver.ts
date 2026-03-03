import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";

import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import type { DunningStatus } from "./DunningState";
import { DunningState } from "./DunningState";
import type { IDunningService } from "./IDunningService";

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

    return DunningState.severityOf(orgStatus) > DunningState.severityOf(teamStatus)
      ? orgStatus
      : teamStatus;
  }
}
