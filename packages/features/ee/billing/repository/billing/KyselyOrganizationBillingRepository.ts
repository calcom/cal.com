import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  BillingRecord,
  Plan,
  SubscriptionStatus,
} from "./IBillingRepository";

export class KyselyOrganizationBillingRepository implements IBillingRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord> {
    const result = await this.dbWrite
      .insertInto("OrganizationBilling")
      .values({
        teamId: args.teamId,
        subscriptionId: args.subscriptionId,
        subscriptionItemId: args.subscriptionItemId,
        customerId: args.customerId,
        planName: args.planName,
        status: args.status,
        subscriptionStart: args.subscriptionStart,
        subscriptionTrialEnd: args.subscriptionTrialEnd,
        subscriptionEnd: args.subscriptionEnd,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      teamId: result.teamId,
      subscriptionId: result.subscriptionId,
      subscriptionItemId: result.subscriptionItemId,
      customerId: result.customerId,
      planName: result.planName as Plan,
      status: result.status as SubscriptionStatus,
    };
  }
}
