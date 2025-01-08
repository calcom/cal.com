import type z from "zod";

import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import type { DomainWideDelegationDeleteSchema } from "./schema";

export default async function handler({
  ctx,
  input,
}: {
  input: z.infer<typeof DomainWideDelegationDeleteSchema>;
  ctx: { user: { id: number; organizationId: number | null } };
}) {
  const { id } = input;

  await DomainWideDelegationRepository.deleteById({ id });

  return { id };
}
