import type { PrismaClient } from "@calcom/prisma";

import type { ITeamBillingDataRepository, TeamWithBillingRecords } from "./ITeamBillingDataRepository";
import { teamBillingSelect } from "./ITeamBillingDataRepository";

export class PrismaTeamBillingDataRepository implements ITeamBillingDataRepository {
  constructor(private prisma: PrismaClient) {}

  /** Fetch a single team with minimal data needed for billing */
  async find(teamId: number) {
    return this.prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: teamBillingSelect });
  }
  /** Fetch a single team with minimal data needed for billing */
  async findBySubscriptionId(subscriptionId: string) {
    return this.prisma.team.findFirst({
      where: {
        metadata: {
          path: ["subscriptionId"],
          equals: subscriptionId,
        },
      },
      select: teamBillingSelect,
    });
  }
  /** Fetch multiple teams with minimal data needed for billing */
  async findMany(teamIds: number[]) {
    return this.prisma.team.findMany({ where: { id: { in: teamIds } }, select: teamBillingSelect });
  }

  async findByIdIncludeBillingRecords(teamId: number): Promise<TeamWithBillingRecords | null> {
    return this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        isOrganization: true,
        parentId: true,
        metadata: true,
        teamBilling: {
          select: {
            id: true,
          },
        },
        organizationBilling: {
          select: {
            id: true,
          },
        },
      },
    });
  }
}
