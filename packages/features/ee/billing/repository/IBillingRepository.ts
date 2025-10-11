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
  updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<void>;
}

export interface IBillingRepositoryConstructorArgs {
  teamId: number;
  isOrganization: boolean;
}

//TODO: Have this extend the BillingRecord type instead of individual
//
export interface IBillingRepositoryCreateArgs {
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  planName: Plan;
  status: SubscriptionStatus;
  subscriptionStart: Date;
  subscriptionTrialEnd: Date | null;
  subscriptionEnd: Date | null;
}
