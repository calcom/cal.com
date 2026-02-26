import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import type { IDunningService } from "./IDunningService";

export interface ResolvedDunning {
  service: IDunningService;
  billingId: string;
  entityType: "team" | "organization";
}

export interface IDunningServiceFactoryDeps {
  teamDunningService: IDunningService;
  orgDunningService: IDunningService;
  teamBillingRepository: IBillingRepository;
  orgBillingRepository: IBillingRepository;
}

export class DunningServiceFactory {
  constructor(private deps: IDunningServiceFactoryDeps) {}

  async forTeam(teamId: number): Promise<ResolvedDunning | null> {
    const orgBillingId = await this.deps.orgBillingRepository.findByTeamId(teamId);
    if (orgBillingId) {
      return {
        service: this.deps.orgDunningService,
        billingId: orgBillingId,
        entityType: "organization",
      };
    }

    const teamBillingId = await this.deps.teamBillingRepository.findByTeamId(teamId);
    if (teamBillingId) {
      return {
        service: this.deps.teamDunningService,
        billingId: teamBillingId,
        entityType: "team",
      };
    }

    return null;
  }
}
