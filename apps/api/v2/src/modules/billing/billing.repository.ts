import { PlatformPlan } from "@/modules/billing/types";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BillingRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  getBillingForTeam = (teamId: number) =>
    this.dbRead.prisma.platformBilling.findUnique({
      where: {
        id: teamId,
      },
    });

  async updateTeamBilling(
    teamId: number,
    billingStart: number,
    billingEnd: number,
    plan: PlatformPlan,
    subscription?: string
  ) {
    return this.dbWrite.prisma.platformBilling.update({
      where: {
        id: teamId,
      },
      data: {
        billingCycleStart: billingStart,
        billingCycleEnd: billingEnd,
        subscriptionId: subscription,
        plan: plan.toString(),
      },
    });
  }
}
