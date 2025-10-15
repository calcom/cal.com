import type { PrismaClient } from "@calcom/prisma";

import {
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  IBillingRepositoryUpdateArgs,
  BillingRecord,
  Plan,
  SubscriptionStatus,
} from "./IBillingRepository";

export class PrismaTeamBillingRepository implements IBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}
  async create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord> {
    const billingRecord = await this.prismaClient.teamBilling.create({
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

  async getBySubscriptionId(subscriptionId: string): Promise<BillingRecord | null> {
    const billingRecord = await this.prismaClient.teamBilling.findUnique({
      where: {
        subscriptionId,
      },
    });

    if (!billingRecord) return null;

    return {
      ...billingRecord,
      planName: billingRecord.planName as Plan,
      status: billingRecord.status as SubscriptionStatus,
    };
  }

  async update(args: IBillingRepositoryUpdateArgs): Promise<void> {
    const { id, ...data } = args;
    await this.prismaClient.teamBilling.update({
      where: {
        id,
      },
      data,
    });
  }
}
