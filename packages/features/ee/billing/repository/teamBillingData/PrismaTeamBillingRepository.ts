import { prisma } from "@calcom/prisma";

import type { ITeamBillingDataRepository } from "./ITeamBillingDataRepository";
import { teamBillingSelect } from "./ITeamBillingDataRepository";

export class PrismaTeamBillingDataRepository implements ITeamBillingDataRepository {
  /** Fetch a single team with minimal data needed for billing */
  async find(teamId: number) {
    return prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: teamBillingSelect });
  }
  /** Fetch a single team with minimal data needed for billing */
  async findBySubscriptionId(subscriptionId: string) {
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
    return prisma.team.findMany({ where: { id: { in: teamIds } }, select: teamBillingSelect });
  }
}
