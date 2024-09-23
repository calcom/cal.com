import type { z } from "zod";

import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import type { DomainWideDelegationToggleEnabledSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

export default async function toggleEnabledHandler({
  input,
}: {
  input: z.infer<typeof DomainWideDelegationToggleEnabledSchema>;
}) {
  const updatedDomainWideDelegation = await DomainWideDelegationRepository.updateById({
    id: input.id,
    data: {
      enabled: input.enabled,
    },
  });

  return ensureNoServiceAccountKey(updatedDomainWideDelegation);
}
