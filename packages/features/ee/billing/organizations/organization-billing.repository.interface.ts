import type { Team } from "@calcom/prisma/client";

export interface OrganizationBillingRepository {
  findById(organizationId: number): Promise<Pick<Team, "id" | "slug" | "name" | "billingPeriod"> | null>;

  getStripeCustomerId(organizationId: number): Promise<string | null>;
  getSubscriptionId(organizationId: number): Promise<string | null>;
}
