import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { TeamBillingDataRepositoryFactory } from "../repository/teamBillingData/teamBillingDataRepositoryFactory";
import { InternalTeamBilling } from "./internal-team-billing";
import { StubTeamBilling } from "./stub-team-billing";
import type { TeamBilling as _TeamBilling, TeamBillingInput } from "./team-billing";

export class TeamBillingService {
  static repo = TeamBillingDataRepositoryFactory.getRepository(!!IS_TEAM_BILLING_ENABLED);

  /** Initialize a single team billing */
  static init(team: TeamBillingInput): _TeamBilling {
    if (IS_TEAM_BILLING_ENABLED) return new InternalTeamBilling(team);
    return new StubTeamBilling(team);
  }
  /** Initialize multiple team billings at once for bulk operations */
  static initMany(teams: TeamBillingInput[]) {
    return teams.map((team) => TeamBillingService.init(team));
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInit(teamId: number) {
    const team = await TeamBillingService.repo.find(teamId);
    return TeamBillingService.init(team);
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInitMany(teamIds: number[]) {
    const teams = await TeamBillingService.repo.findMany(teamIds);
    return TeamBillingService.initMany(teams);
  }
}
