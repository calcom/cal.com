import type { PrismaClient } from "@calcom/prisma";

import type {
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  IBillingRepositoryUpdateArgs,
  BillingRecord,
  Plan,
  SubscriptionStatus,
} from "./IBillingRepository";

export class PrismaOrganizationBillingRepository implements IBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}
  async create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord> {
    const billingRecord = await this.prismaClient.organizationBilling.create({
      data: {
        ...args,
      },
    });

    return {
      ...billingRecord,
      planName: billingRecord.planName as Plan,
      status: billingRecord.status as SubscriptionStatus,
    };
  }

  async findBySubscriptionId(subscriptionId: string): Promise<{ id: string; teamId: number } | null> {
    const record = await this.prismaClient.organizationBilling.findUnique({
      where: { subscriptionId },
      select: { id: true, teamId: true },
    });
    return record;
  }

  async updateById(id: string, data: IBillingRepositoryUpdateArgs): Promise<void> {
    await this.prismaClient.organizationBilling.update({
      where: { id },
      data,
    });
  }
}
