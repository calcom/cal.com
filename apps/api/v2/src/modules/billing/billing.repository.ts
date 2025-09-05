import { Injectable, Logger } from "@nestjs/common";
import { PlatformPlan } from "@/modules/billing/types";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class BillingRepository {
  private readonly logger = new Logger("BillingRepository");
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  getBillingForTeam = (teamId: number) =>
    this.dbRead.prisma.platformBilling.findUnique({
      where: {
        id: teamId,
      },
    });

  async getBillingForTeamBySubscriptionId(subscriptionId: string) {
    return this.dbRead.prisma.platformBilling.findFirst({
      where: {
        subscriptionId,
      },
    });
  }

  async updateTeamBilling(
    teamId: number,
    billingStart: number,
    billingEnd: number,
    plan: PlatformPlan,
    subscriptionId?: string,
    priceId?: string
  ) {
    return this.dbWrite.prisma.platformBilling.update({
      where: {
        id: teamId,
      },
      data: {
        billingCycleStart: billingStart,
        billingCycleEnd: billingEnd,
        subscriptionId,
        plan: plan.toString(),
        overdue: false,
        priceId,
      },
    });
  }

  async updateBillingOverdue(subId: string, cusId: string, overdue: boolean) {
    try {
      return this.dbWrite.prisma.platformBilling.updateMany({
        where: {
          subscriptionId: subId,
          customerId: cusId,
        },
        data: {
          overdue,
        },
      });
    } catch (err) {
      this.logger.error("Could not update billing overdue", {
        subId,
        cusId,
        err,
      });
    }
  }

  async deleteBilling(id: number) {
    return this.dbWrite.prisma.platformBilling.delete({
      where: {
        id,
      },
    });
  }
}
