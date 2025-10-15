export enum Plan {
  TEAM = "TEAM",
  ORGANIZATION = "ORGANIZATION",
  ENTERPRISE = "ENTERPRISE",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  PAST_DUE = "PAST_DUE",
  TRIALING = "TRIALING",
  INCOMPLETE = "INCOMPLETE",
  INCOMPLETE_EXPIRED = "INCOMPLETE_EXPIRED",
  UNPAID = "UNPAID",
  PAUSED = "PAUSED",
}

export interface BillingRecord {
  id: string;
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  planName: Plan;
  status: SubscriptionStatus;
  subscriptionStart: Date | null;
  subscriptionTrialEnd: Date | null;
  subscriptionEnd: Date | null;
}

export interface IBillingRepository {
  create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord>;
  getBySubscriptionId(id: string): Promise<BillingRecord | null>;
  update(args: IBillingRepositoryUpdateArgs): Promise<void>;
}

export interface IBillingRepositoryConstructorArgs {
  teamId: number;
  isOrganization: boolean;
}

export type IBillingRepositoryCreateArgs = Omit<BillingRecord, "id">;

export type IBillingRepositoryUpdateArgs = Omit<
  BillingRecord,
  "teamId" | "subscriptionId" | "subscriptionItemId" | "customerId" | "planName"
>;
