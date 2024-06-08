import type { Team } from "@prisma/client";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { InternalTeamBilling } from "./internal-team-billing";
import { StubTeamBilling } from "./stub-team-billing";
import type { TeamBilling as _TeamBilling } from "./team-billing";

export class TeamBilling {
  static create(team: Pick<Team, "id" | "metadata">): _TeamBilling {
    if (IS_TEAM_BILLING_ENABLED) return new InternalTeamBilling(team);
    return new StubTeamBilling(team);
  }
}
