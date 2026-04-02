import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

@Injectable()
export class TeamsBillingRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getSubscriptionIdByTeamId(teamId: number): Promise<string | null> {
    const billing = await this.dbRead.prisma.teamBilling.findUnique({
      where: { teamId },
      select: { subscriptionId: true },
    });
    return billing?.subscriptionId ?? null;
  }
}
