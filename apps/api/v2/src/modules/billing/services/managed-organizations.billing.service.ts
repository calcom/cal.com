import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { hasMinimumPlan } from "@/modules/auth/guards/billing/platform-plan.guard";
import { orderedPlans, PlatformPlan } from "@/modules/billing/types";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class ManagedOrganizationsBillingService {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async createManagedOrganizationBilling(managerOrgId: number, managedOrgId: number) {
    const managerOrgBilling = await this.dbRead.prisma.platformBilling.findUnique({
      where: { id: managerOrgId },
    });
    if (!managerOrgBilling) {
      throw new NotFoundException("Manager organization billing not found.");
    }
    if (
      !hasMinimumPlan({
        currentPlan: managerOrgBilling.plan as PlatformPlan,
        minimumPlan: PlatformPlan.SCALE,
        plans: orderedPlans,
      })
    ) {
      throw new ForbiddenException(
        `organization with id=${managerOrgId} does not have required plan for this operation. Minimum plan is ${
          PlatformPlan.SCALE
        } while the organization has ${managerOrgBilling.plan || "undefined"}.`
      );
    }

    return this.dbWrite.prisma.platformBilling.create({
      data: {
        id: managedOrgId,
        customerId: managerOrgBilling.customerId,
        subscriptionId: managerOrgBilling.subscriptionId,
        plan: managerOrgBilling.plan,
        billingCycleStart: managerOrgBilling.billingCycleStart,
        billingCycleEnd: managerOrgBilling.billingCycleEnd,
        overdue: managerOrgBilling.overdue,
        managerBillingId: managerOrgBilling.id,
      },
    });
  }
}
