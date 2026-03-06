import type { PrismaClient } from "@calcom/prisma";
import type {
  BillingRecord,
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  IBillingRepositoryUpdateArgs,
  Plan,
  SubscriptionStatus,
} from "./IBillingRepository";

export class PrismaTeamBillingRepository implements IBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByTeamId(teamId: number): Promise<string | null> {
    const record = await this.prismaClient.teamBilling.findUnique({
      where: { teamId },
      select: { id: true },
    });
    return record?.id ?? null;
  }

  async findTeamIdByBillingId(billingId: string): Promise<number | null> {
    const record = await this.prismaClient.teamBilling.findUnique({
      where: { id: billingId },
      select: { teamId: true },
    });
    return record?.teamId ?? null;
  }

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

  async deleteByTeamId(teamId: number): Promise<void> {
    await this.prismaClient.teamBilling.deleteMany({
      where: { teamId },
    });
  }

  async findFullByTeamId(teamId: number): Promise<BillingRecord | null> {
    const record = await this.prismaClient.teamBilling.findUnique({
      where: { teamId },
      select: {
        id: true,
        teamId: true,
        subscriptionId: true,
        subscriptionItemId: true,
        customerId: true,
        planName: true,
        status: true,
        billingPeriod: true,
        pricePerSeat: true,
        paidSeats: true,
      },
    });
    if (!record) return null;
    return {
      ...record,
      planName: record.planName as Plan,
      status: record.status as SubscriptionStatus,
    };
  }

  async findBySubscriptionId(subscriptionId: string): Promise<{ id: string; teamId: number } | null> {
    const record = await this.prismaClient.teamBilling.findUnique({
      where: { subscriptionId },
      select: { id: true, teamId: true },
    });
    return record;
  }

  async updateById(id: string, data: IBillingRepositoryUpdateArgs): Promise<void> {
    await this.prismaClient.teamBilling.update({
      where: { id },
      data,
    });
  }
}
