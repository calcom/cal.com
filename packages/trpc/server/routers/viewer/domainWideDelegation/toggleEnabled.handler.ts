import type { z } from "zod";

import { DomainWideDelegation } from "@calcom/features/domain-wide-delegation/domain-wide-delegation";
import { checkIfSuccessfullyConfiguredInWorkspace } from "@calcom/lib/domainWideDelegation/server";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/domainWideDelegation";

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
  user: { id: number; email: string; organizationId: number | null };
}) => {
  const domainWideDelegationRepository = await DomainWideDelegation.init(user.id, user.organizationId);
  const domainWideDelegation = await domainWideDelegationRepository.findByIdIncludeSensitiveServiceAccountKey(
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
  ctx: { user: { id: number; email: string; organizationId: number | null } };
  input: z.infer<typeof DomainWideDelegationToggleEnabledSchema>;
}) {
  const { user: loggedInUser } = ctx;

  if (input.enabled) {
    await assertWorkspaceConfigured({
      domainWideDelegationId: input.id,
      user: loggedInUser,
    });
  }

  const domainWideDelegationRepository = await DomainWideDelegation.init(
    loggedInUser.id,
    loggedInUser.organizationId
  );

  const updatedDomainWideDelegation = await domainWideDelegationRepository.updateById({
    id: input.id,
    data: {
      enabled: input.enabled,
    },
  });

  return ensureNoServiceAccountKey(updatedDomainWideDelegation);
}
