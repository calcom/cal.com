import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import type { ITeamBillingRepository } from "./team-billing.repository.interface";
import { teamBillingSelect } from "./team-billing.repository.interface";

const stubTeam = { id: -1, metadata: {}, isOrganization: true, parentId: -1 };

export class TeamBillingRepository implements ITeamBillingRepository {
  /** Fetch a single team with minimal data needed for billing */
  async find(teamId: number) {
    if (!IS_TEAM_BILLING_ENABLED) return stubTeam;
    return prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: teamBillingSelect });
  }
  /** Fetch a single team with minimal data needed for billing */
  async findBySubscriptionId(subscriptionId: string) {
    if (!IS_TEAM_BILLING_ENABLED) return stubTeam;
    const team = await prisma.team.findFirstOrThrow({
      where: {
        metadata: {
          path: ["subscriptionId"],
          equals: subscriptionId,
        },
      },
      select: teamBillingSelect,
    });
    return team;
  }
  /** Fetch multiple teams with minimal data needed for billing */
  async findMany(teamIds: number[]) {
    if (!IS_TEAM_BILLING_ENABLED) return [];
    return prisma.team.findMany({ where: { id: { in: teamIds } }, select: teamBillingSelect });
  }
}
