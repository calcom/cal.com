import type z from "zod";

import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import type { DomainWideDelegationDeleteSchema } from "./schema";

export default async function handler({
  input,
}: {
  input: z.infer<typeof DomainWideDelegationDeleteSchema>;
}) {
  const { id } = input;

  await DomainWideDelegationRepository.deleteById({ id });

  return { id };
}
