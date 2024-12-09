import { DomainWideDelegation } from "@calcom/features/domain-wide-delegation/domain-wide-delegation";
import type { PrismaClient } from "@calcom/prisma";
import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";

import { ensureNoServiceAccountKey } from "./utils";

export default async function handler({
  ctx,
}: {
  ctx: { prisma: PrismaClient; user: { id: number; organization: { id: number | null } } };
}) {
  const { user } = ctx;

  const organizationId = user.organization?.id;

  if (!organizationId) {
    throw new Error("You must be in an organization to list domain wide delegations");
  }
  const domainWideDelegationRepository = await DomainWideDelegation.init(user.id, organizationId);

  const domainWideDelegations = await domainWideDelegationRepository.findDelegationsWithServiceAccount({
    organizationId,
  });

  return domainWideDelegations.map((delegation) => {
    // Let's not parse the service account key here, we should be able to fix the item with the problem, so we always try to return the complete list
    const serviceAccountKey = serviceAccountKeySchema.safeParse(delegation.serviceAccountKey);

    return ensureNoServiceAccountKey({
      ...delegation,
      serviceAccountClientId: serviceAccountKey.success ? serviceAccountKey.data?.client_id ?? null : null,
    });
  });
}
