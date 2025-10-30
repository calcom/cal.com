import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { IBillingRepository } from "../../repository/billing/IBillingRepository";
import { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import { TeamBillingDataRepositoryFactory } from "../../repository/teamBillingData/teamBillingDataRepositoryFactory";
import type { ITeamBillingService, TeamBillingInput } from "./ITeamBillingService";
import { StubTeamBillingService } from "./stubTeamBillingService";
import { TeamBillingService } from "./teamBillingService";

export class TeamBillingServiceFactory {
  static teamBillingDataRepository = TeamBillingDataRepositoryFactory.getRepository(
    !!IS_TEAM_BILLING_ENABLED
  );

  constructor(
    private teamBillingDataRepository: ITeamBillingDataRepository,
    private billingRepository: IBillingRepository
  ) {}

  /** Initialize a single team billing */
  init(team: TeamBillingInput): ITeamBillingService {
    if (IS_TEAM_BILLING_ENABLED)
      return new TeamBillingService(team, this.teamBillingDataRepository, this.billingRepository);
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
