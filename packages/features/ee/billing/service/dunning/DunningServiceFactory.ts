import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import type { IDunningService } from "./IDunningService";

export interface ResolvedDunning {
  service: IDunningService;
  billingId: string;
  entityType: "team" | "organization";
}

export interface AdvancementCandidate {
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

  async getAdvancementCandidates(): Promise<AdvancementCandidate[]> {
    const [teamIds, orgIds] = await Promise.all([
      this.deps.teamDunningService.getBillingIdsToAdvance(),
      this.deps.orgDunningService.getBillingIdsToAdvance(),
    ]);
    return [
      ...teamIds.map((billingId) => ({ billingId, entityType: "team" as const })),
      ...orgIds.map((billingId) => ({ billingId, entityType: "organization" as const })),
    ];
  }

  async advanceByBillingId(
    billingId: string,
    entityType: "team" | "organization"
  ): Promise<{ advanced: boolean; from?: string; to?: string }> {
    const service =
      entityType === "organization" ? this.deps.orgDunningService : this.deps.teamDunningService;
    return service.advanceDunning(billingId);
  }

  async findTeamIdByBillingId(
    billingId: string,
    entityType: "team" | "organization"
  ): Promise<number | null> {
    const repo =
      entityType === "organization" ? this.deps.orgBillingRepository : this.deps.teamBillingRepository;
    return repo.findTeamIdByBillingId(billingId);
  }

}
