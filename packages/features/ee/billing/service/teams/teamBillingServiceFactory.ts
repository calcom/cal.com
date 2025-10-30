import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { TeamBillingDataRepositoryFactory } from "../../repository/teamBillingData/teamBillingDataRepositoryFactory";
import { StubTeamBillingService } from "./stubTeamBillingService";
import { TeamBillingService } from "./teamBillingService";
import type { TeamBillingService as _TeamBilling, TeamBillingInput } from "./teamBillingService.interface";

export class TeamBillingServiceFactory {
  static repo = TeamBillingDataRepositoryFactory.getRepository(!!IS_TEAM_BILLING_ENABLED);

  /** Initialize a single team billing */
  static init(team: TeamBillingInput): _TeamBilling {
    if (IS_TEAM_BILLING_ENABLED) return new TeamBillingService(team);
    return new StubTeamBillingService(team);
  }
  /** Initialize multiple team billings at once for bulk operations */
  static initMany(teams: TeamBillingInput[]) {
    return teams.map((team) => this.init(team));
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInit(teamId: number) {
    const team = await this.repo.find(teamId);
    return this.init(team);
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInitMany(teamIds: number[]) {
    const teams = await this.repo.findMany(teamIds);
    return this.initMany(teams);
  }
}
