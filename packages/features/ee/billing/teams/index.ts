import { Prisma } from "@prisma/client";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { InternalTeamBilling } from "./internal-team-billing";
import { StubTeamBilling } from "./stub-team-billing";
import type { TeamBilling as _TeamBilling, TeamBillingInput } from "./team-billing";

const stubTeam = { id: -1, metadata: {}, isOrganization: true, parentId: -1 };
const teamBillingSelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  metadata: true,
  isOrganization: true,
  parentId: true,
});

export class TeamBilling {
  /** Initialize a single team billing */
  static init(team: TeamBillingInput): _TeamBilling {
    if (IS_TEAM_BILLING_ENABLED) return new InternalTeamBilling(team);
    return new StubTeamBilling(team);
  }
  /** Initialize multuple team billings at once for bulk operations */
  static initMany(teams: TeamBillingInput[]) {
    return teams.map((team) => TeamBilling.init(team));
  }
  /** Fetch a single team with minimal data needed for billing */
  static async find(teamId: number) {
    if (!IS_TEAM_BILLING_ENABLED) return stubTeam;
    return prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: teamBillingSelect });
  }
  /** Fetch a single team with minimal data needed for billing */
  static async findBySubscriptionId(subscriptionId: string) {
    if (!IS_TEAM_BILLING_ENABLED) return stubTeam;
    console.log("subscriptionId", subscriptionId);
    const team = await prisma.team.findFirstOrThrow({
      where: {
        metadata: {
          path: ["subscriptionId"],
          equals: subscriptionId,
        },
      },
      select: teamBillingSelect,
    });
    console.log("team", team);
    return team;
  }
  /** Fetch multiple teams with minimal data needed for billing */
  static async findMany(teamIds: number[]) {
    if (!IS_TEAM_BILLING_ENABLED) return [];
    return prisma.team.findMany({ where: { id: { in: teamIds } }, select: teamBillingSelect });
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInit(teamId: number) {
    const team = await TeamBilling.find(teamId);
    return TeamBilling.init(team);
  }
  /** Fetch and initialize multiple team billings in one go */
  static async findAndInitMany(teamIds: number[]) {
    const teams = await TeamBilling.findMany(teamIds);
    return TeamBilling.initMany(teams);
  }
}
