import type { IBillingRepository } from "../../repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import type { ITeamBillingService, TeamBillingInput } from "./ITeamBillingService";
import { StubTeamBillingService } from "./stubTeamBillingService";
import { TeamBillingService } from "./teamBillingService";

export class TeamBillingServiceFactory {
  private billingProviderService: IBillingProviderService;
  private teamBillingDataRepository: ITeamBillingDataRepository;
  private billingRepository: IBillingRepository;
  private isTeamBillingEnabled: boolean;

  constructor({
    billingProviderService,
    teamBillingDataRepository,
    billingRepository,
    isTeamBillingEnabled,
  }: {
    billingProviderService: IBillingProviderService;
    teamBillingDataRepository: ITeamBillingDataRepository;
    billingRepository: IBillingRepository;
    isTeamBillingEnabled: boolean;
  }) {
    this.billingProviderService = billingProviderService;
    this.teamBillingDataRepository = teamBillingDataRepository;
    this.billingRepository = billingRepository;
    this.isTeamBillingEnabled = isTeamBillingEnabled;
  }

  /** Initialize a single team billing */
  init(team: TeamBillingInput): ITeamBillingService {
    if (this.isTeamBillingEnabled)
      return new TeamBillingService({
        team,
        billingProviderService: this.billingProviderService,
        teamBillingDataRepository: this.teamBillingDataRepository,
        billingRepository: this.billingRepository,
      });
    return new StubTeamBillingService(team);
  }
  /** Initialize multiple team billings at once for bulk operations */
  initMany(teams: TeamBillingInput[]) {
    return teams.map((team) => this.init(team));
  }
  /** Fetch and initialize multiple team billings in one go */
  async findAndInit(teamId: number) {
    const team = await this.teamBillingDataRepository.find(teamId);
    return this.init(team);
  }
  /** Fetch and initialize multiple team billings in one go */
  async findAndInitMany(teamIds: number[]) {
    const teams = await this.teamBillingDataRepository.findMany(teamIds);
    return this.initMany(teams);
  }
}
