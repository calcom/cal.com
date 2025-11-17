import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import type { ITeamBillingService, TeamBillingInput } from "./ITeamBillingService";
import { StubTeamBillingService } from "./StubTeamBillingService";
import { TeamBillingService } from "./TeamBillingService";

// Export the interface for type safety in DI modules
export interface ITeamBillingServiceFactoryDeps {
  billingProviderService: IBillingProviderService;
  teamBillingDataRepository: ITeamBillingDataRepository;
  billingRepositoryFactory: (isOrganization: boolean) => IBillingRepository;
  isTeamBillingEnabled: boolean;
}

export class TeamBillingServiceFactory {
  // Store dependencies as single object (IOctopus pattern)
  constructor(private readonly deps: ITeamBillingServiceFactoryDeps) {}

  /** Initialize a single team billing */
  init(team: TeamBillingInput): ITeamBillingService {
    if (!this.deps.isTeamBillingEnabled) {
      return new StubTeamBillingService(team);
    }

    // Call the factory function with runtime context to get the correct repository
    const billingRepository = this.deps.billingRepositoryFactory(team.isOrganization);

    return new TeamBillingService({
      team,
      billingProviderService: this.deps.billingProviderService,
      teamBillingDataRepository: this.deps.teamBillingDataRepository,
      billingRepository,
    });
  }

  /** Initialize multiple team billings at once for bulk operations */
  initMany(teams: TeamBillingInput[]) {
    return teams.map((team) => this.init(team));
  }

  /** Fetch and initialize a single team billing in one go */
  async findAndInit(teamId: number) {
    const team = await this.deps.teamBillingDataRepository.find(teamId);
    return this.init(team);
  }

  /** Fetch and initialize multiple team billings in one go */
  async findAndInitMany(teamIds: number[]) {
    const teams = await this.deps.teamBillingDataRepository.findMany(teamIds);
    return this.initMany(teams);
  }
}
