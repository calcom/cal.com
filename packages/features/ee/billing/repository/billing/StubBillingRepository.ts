import type {
  BillingRecord,
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  IBillingRepositoryUpdateArgs,
} from "./IBillingRepository";

export class StubBillingRepository implements IBillingRepository {
  async create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord> {
    // Stub implementation - returns a mock billing record without database interaction
    return {
      id: "stub-billing-id",
      teamId: args.teamId,
      subscriptionId: args.subscriptionId,
      subscriptionItemId: args.subscriptionItemId,
      customerId: args.customerId,
      planName: args.planName,
      status: args.status,
    };
  }

  async findBySubscriptionId(_subscriptionId: string): Promise<{ id: string; teamId: number } | null> {
    // Stub implementation - returns null indicating no record found
    return null;
  }

  async updateById(_id: string, _data: IBillingRepositoryUpdateArgs): Promise<void> {
    // Stub implementation - no-op
  }
}
