import type { Team } from "@calcom/prisma/client";
import type { BillingPeriod } from "@calcom/prisma/zod-utils";
import type { TrackingData } from "@calcom/lib/tracking";

import type { OrganizationBillingRepository } from "./organization-billing.repository";

export type OrgCheckoutSessionInput = {
  userId: number;
  seatsUsed: number;
  seatsToChargeFor?: number | null;
  pricePerSeat: number | null;
  billingPeriod?: BillingPeriod;
  tracking?: TrackingData;
};

export abstract class OrganizationBilling {
  protected organization: Pick<Team, "id" | "slug" | "name" | "billingPeriod">;
  protected repository: OrganizationBillingRepository;

  constructor(organization: Pick<Team, "id" | "slug" | "name" | "billingPeriod">) {
    this.organization = organization;
  }

  abstract getStripeCustomerId(): Promise<string | null>;
  abstract getSubscriptionId(): Promise<string | null>;
  abstract getSubscriptionItems(): Promise<{ id: string; quantity: number }[]>;
  abstract createCheckoutSession(input: OrgCheckoutSessionInput): Promise<{ url: string | null }>;
}
