import type z from "zod";

import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import { TRPCError } from "@trpc/server";

import type { DomainWideDelegationDeleteSchema } from "./schema";

export default async function handler({
  input,
}: {
  input: z.infer<typeof DomainWideDelegationDeleteSchema>;
}) {
  const { id } = input;

  // We might want to consider allowing this in the future. Right now, toggling off DWD achieves similar but non-destructive effect
  throw new TRPCError({ code: "BAD_REQUEST", message: "Not allowed" });
  await DomainWideDelegationRepository.deleteById({ id });

  return { id };
}
