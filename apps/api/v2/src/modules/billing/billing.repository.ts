import { Injectable } from "@nestjs/common";

import { PlatformPlan } from "../billing/types";

@Injectable()
export class BillingRepository {
  // TODO: PrismaReadService
  getBillingForTeam = (teamId: number) => null;
  // this.dbRead.prisma.platformBilling.findUnique({
  //   where: {
  //     id: teamId,
  //   },
  // });

  // TODO: PrismaWtiteService
  async updateTeamBilling(
    teamId: number,
    billingStart: number,
    billingEnd: number,
    plan: PlatformPlan,
    subscription?: string
  ) {
    // return this.dbWrite.prisma.platformBilling.update({
    //   where: {
    //     id: teamId,
    //   },
    //   data: {
    //     billingCycleStart: billingStart,
    //     billingCycleEnd: billingEnd,
    //     subscriptionId: subscription,
    //     plan: plan.toString(),
    //   },
    // });
  }
}
