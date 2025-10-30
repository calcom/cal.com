import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { TeamBillingDataRepositoryFactory } from "../repository/teamBillingData/teamBillingDataRepositoryFactory";
import { InternalTeamBilling } from "./internal-team-billing";
import { StubTeamBilling } from "./stub-team-billing";
import type { TeamBilling as _TeamBilling, TeamBillingInput } from "./team-billing";

export class TeamBilling {
  static repo = TeamBillingDataRepositoryFactory.getRepository(!!IS_TEAM_BILLING_ENABLED);

  /** Initialize a single team billing */
  static init(team: TeamBillingInput): _TeamBilling {
    if (IS_TEAM_BILLING_ENABLED) return new InternalTeamBilling(team);
    return new StubTeamBilling(team);
  }
  /** Initialize multiple team billings at once for bulk operations */
  static initMany(teams: TeamBillingInput[]) {
    return teams.map((team) => TeamBilling.init(team));
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInit(teamId: number) {
    const team = await TeamBilling.repo.find(teamId);
    return TeamBilling.init(team);
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInitMany(teamIds: number[]) {
    const teams = await TeamBilling.repo.findMany(teamIds);
    return TeamBilling.initMany(teams);
  }
}
