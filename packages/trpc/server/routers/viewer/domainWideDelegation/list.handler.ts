import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import { encryptedServiceAccountKeySchema } from "@calcom/lib/server/serviceAccountKey";
import type { PrismaClient } from "@calcom/prisma";

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
  const domainWideDelegations =
    await DomainWideDelegationRepository.findByOrgIdIncludeSensitiveServiceAccountKey({
      organizationId,
    });

  return domainWideDelegations.map((delegation) => {
    // Let's not parse the service account key here, we should be able to fix the item with the problem, so we always try to return the complete list
    const serviceAccountKey = encryptedServiceAccountKeySchema.safeParse(delegation.serviceAccountKey);

    return ensureNoServiceAccountKey({
      ...delegation,
      serviceAccountClientId: serviceAccountKey.success ? serviceAccountKey.data?.client_id ?? null : null,
    });
  });
}
