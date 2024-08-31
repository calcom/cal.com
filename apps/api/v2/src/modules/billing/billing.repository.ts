import { Injectable } from "@nestjs/common";
import { PlatformPlan } from "src/modules/billing/types";
import { PrismaReadService } from "src/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "src/modules/prisma/prisma-write.service";

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
