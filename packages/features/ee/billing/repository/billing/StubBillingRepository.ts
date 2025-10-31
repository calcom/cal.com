import type { BillingRecord, IBillingRepository, IBillingRepositoryCreateArgs } from "./IBillingRepository";

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
}
