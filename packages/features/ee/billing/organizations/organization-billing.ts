import type { Team } from "@calcom/prisma/client";

import type { OrganizationBillingRepository } from "./organization-billing.repository";

export abstract class OrganizationBilling {
  protected organization: Pick<Team, "id" | "slug" | "name" | "billingPeriod">;
  protected repository: OrganizationBillingRepository;

  constructor(organization: Pick<Team, "id" | "slug" | "name" | "billingPeriod">) {
    this.organization = organization;
  }

  abstract getStripeCustomerId(): Promise<string | null>;
  abstract getSubscriptionId(): Promise<string | null>;
  abstract getSubscriptionItems(): Promise<{ id: string; quantity: number }[]>;
}
