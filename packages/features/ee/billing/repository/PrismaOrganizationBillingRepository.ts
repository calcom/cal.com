import type { PrismaClient } from "@calcom/prisma";

import {
  IBillingRepository,
  IBillingRepositoryCreateArgs,
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
  async getBySubscriptionId(id: string): Promise<BillingRecord | null> {
    const billingRecord = await this.prismaClient.organizationBilling.findUnique({
      where: {
        id,
      },
    });

    if (!billingRecord) return null;

    return {
      ...billingRecord,
      planName: billingRecord.planName as Plan,
      status: billingRecord.status as SubscriptionStatus,
    };
  }
  async updateSubscriptionStatus(id: string, status: SubscriptionStatus) {
    await this.prismaClient.organizationBilling.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }
}
