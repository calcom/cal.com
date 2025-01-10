import { IS_PRODUCTION } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

import { InternalOrganizationBilling } from "./internal-organization-billing";
import { OrganizationBillingRepository } from "./organization-billing.repository";
import { StubOrganizationBilling } from "./stub-organization-billing";

export { OrganizationBillingRepository };

export const OrganizationBilling = IS_PRODUCTION ? InternalOrganizationBilling : StubOrganizationBilling;

export async function findAndInitMany(organizationIds: number[]) {
  const organizations = await prisma.team.findMany({
    where: {
      id: {
        in: organizationIds,
      },
      isOrganization: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      billingPeriod: true,
    },
  });

  return organizations.map((organization) => new OrganizationBilling(organization));
}
