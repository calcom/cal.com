import type { PrismaClient } from "@calcom/prisma";
import type { IBillingRepository } from "../billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "./ITeamBillingDataRepository";
import { teamBillingSelect } from "./ITeamBillingDataRepository";

export class PrismaTeamBillingDataRepository implements ITeamBillingDataRepository {
  constructor(
    private prisma: PrismaClient,
    private teamBillingRepo: IBillingRepository,
    private orgBillingRepo: IBillingRepository
  ) {}

  /** Fetch a single team with minimal data needed for billing */
  async find(teamId: number) {
    return this.prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: teamBillingSelect });
  }

  /** Fetch a single team with minimal data needed for billing by looking up the TeamBilling or OrganizationBilling table */
  async findBySubscriptionId(subscriptionId: string) {
    const teamBilling = await this.teamBillingRepo.findBySubscriptionId(subscriptionId);
    if (teamBilling) {
      return this.prisma.team.findUnique({
        where: { id: teamBilling.teamId },
        select: teamBillingSelect,
      });
    }

    const orgBilling = await this.orgBillingRepo.findBySubscriptionId(subscriptionId);
    if (orgBilling) {
      return this.prisma.team.findUnique({
        where: { id: orgBilling.teamId },
        select: teamBillingSelect,
      });
    }

    return null;
  }
  /** Fetch multiple teams with minimal data needed for billing */
  async findMany(teamIds: number[]) {
    return this.prisma.team.findMany({ where: { id: { in: teamIds } }, select: teamBillingSelect });
  }
}
