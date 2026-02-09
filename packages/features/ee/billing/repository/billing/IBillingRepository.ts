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
}

export interface IBillingRepositoryUpdateArgs {
  paidSeats?: number | null;
  subscriptionStart?: Date | null;
  subscriptionEnd?: Date | null;
  subscriptionTrialEnd?: Date | null;
  billingPeriod?: "MONTHLY" | "ANNUALLY" | null;
  pricePerSeat?: number | null;
}

export interface IBillingRepository {
  create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord>;
  findBySubscriptionId(subscriptionId: string): Promise<{ id: string; teamId: number } | null>;
  updateById(id: string, data: IBillingRepositoryUpdateArgs): Promise<void>;
}

export interface IBillingRepositoryConstructorArgs {
  teamId: number;
  isOrganization: boolean;
}

export interface IBillingRepositoryCreateArgs {
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  planName: Plan;
  status: SubscriptionStatus;
  subscriptionStart?: Date;
  subscriptionTrialEnd?: Date;
  subscriptionEnd?: Date;
  billingPeriod?: "MONTHLY" | "ANNUALLY";
  pricePerSeat?: number;
  paidSeats?: number;
}
