import type { Team } from "@prisma/client";

export interface OrganizationBillingRepository {
  findById(organizationId: number): Promise<Pick<Team, "id" | "slug" | "name"> | null>;

  getStripeCustomerId(organizationId: number): Promise<string | null>;
  getSubscriptionId(organizationId: number): Promise<string | null>;
  updateStripeCustomerId(organizationId: number, stripeCustomerId: string): Promise<Team>;
}
