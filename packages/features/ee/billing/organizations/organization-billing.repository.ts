import { prisma } from "@calcom/prisma";

import type { OrganizationBillingRepository as IOrganizationBillingRepository } from "./organization-billing.repository.interface";

export class OrganizationBillingRepository implements IOrganizationBillingRepository {
  async findById(organizationId: number) {
    return prisma.team.findUnique({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });
  }

  async getStripeCustomerId(organizationId: number) {
    const organization = await prisma.team.findUnique({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      select: {
        stripeCustomerId: true,
      },
    });
    return organization?.stripeCustomerId ?? null;
  }

  async updateStripeCustomerId(organizationId: number, stripeCustomerId: string) {
    return prisma.team.update({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      data: {
        stripeCustomerId,
      },
    });
  }

  async getSubscriptionId(organizationId: number) {
    const organization = await prisma.team.findUnique({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      select: {
        platformBilling: {
          select: {
            subscriptionId: true,
          },
        },
      },
    });
    return organization?.platformBilling?.subscriptionId ?? null;
  }
}
