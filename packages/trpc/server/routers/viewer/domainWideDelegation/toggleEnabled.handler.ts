import type { z } from "zod";

import { checkIfSuccessfullyConfiguredInWorkspace } from "@calcom/lib/domainWideDelegation/server";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import type { DomainWideDelegationToggleEnabledSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

const assertWorkspaceConfigured = async ({
  domainWideDelegationId,
  user,
}: {
  domainWideDelegationId: string;
  user: { id: number; email: string };
}) => {
  const domainWideDelegation = await DomainWideDelegationRepository.findById({ id: domainWideDelegationId });
  if (!domainWideDelegation) {
    throw new Error("Domain wide delegation not found");
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
