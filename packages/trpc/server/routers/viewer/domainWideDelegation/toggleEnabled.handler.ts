import type { z } from "zod";

import { checkIfSuccessfullyConfiguredInWorkspace } from "@calcom/lib/domainWideDelegation/server";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/domainWideDelegation";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import type { DomainWideDelegationToggleEnabledSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

function hasServiceAccountKey<T extends { serviceAccountKey: ServiceAccountKey | null }>(
  domainWideDelegation: T
): domainWideDelegation is T & { serviceAccountKey: ServiceAccountKey } {
  return domainWideDelegation.serviceAccountKey !== null;
}

const assertWorkspaceConfigured = async ({
  domainWideDelegationId,
  user,
}: {
  domainWideDelegationId: string;
  user: { id: number; email: string };
}) => {
  const domainWideDelegation = await DomainWideDelegationRepository.findByIdIncludeSensitiveServiceAccountKey(
    {
      id: domainWideDelegationId,
    }
  );

  if (!domainWideDelegation) {
    throw new Error("Domain wide delegation not found");
  }

  if (!hasServiceAccountKey(domainWideDelegation)) {
    throw new Error("Domain wide delegation doesn't have service account key");
  }

  const isSuccessfullyConfigured = await checkIfSuccessfullyConfiguredInWorkspace({
    domainWideDelegation,
    user,
  });

  if (!isSuccessfullyConfigured) {
    throw new Error("Workspace not successfully configured");
  }
};

export default async function toggleEnabledHandler({
  ctx,
  input,
}: {
  ctx: { user: { id: number; email: string } };
  input: z.infer<typeof DomainWideDelegationToggleEnabledSchema>;
}) {
  const { user: loggedInUser } = ctx;

  if (input.enabled) {
    await assertWorkspaceConfigured({ domainWideDelegationId: input.id, user: loggedInUser });
  }

  const updatedDomainWideDelegation = await DomainWideDelegationRepository.updateById({
    id: input.id,
    data: {
      enabled: input.enabled,
    },
  });

  return ensureNoServiceAccountKey(updatedDomainWideDelegation);
}
