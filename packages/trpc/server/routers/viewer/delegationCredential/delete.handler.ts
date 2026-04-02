import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { TRPCError } from "@trpc/server";
import type z from "zod";
import type { DelegationCredentialDeleteSchema } from "./schema";

export default async function handler({
  input,
}: {
  input: z.infer<typeof DelegationCredentialDeleteSchema>;
}) {
  const { id } = input;

  // We might want to consider allowing this in the future. Right now, toggling off DelegationCredential achieves similar but non-destructive effect
  throw new TRPCError({ code: "BAD_REQUEST", message: "Not allowed" });
  await DelegationCredentialRepository.deleteById({ id });

  return { id };
}
