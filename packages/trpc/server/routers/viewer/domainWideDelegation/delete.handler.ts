import type z from "zod";

import { DomainWideDelegation } from "@calcom/features/domain-wide-delegation/domain-wide-delegation";

import type { DomainWideDelegationDeleteSchema } from "./schema";

export default async function handler({
  ctx,
  input,
}: {
  input: z.infer<typeof DomainWideDelegationDeleteSchema>;
  ctx: { user: { id: number; organizationId: number | null } };
}) {
  const { id } = input;

  const domainWideDelegationRepository = await DomainWideDelegation.init(
    ctx.user.id,
    ctx.user.organizationId
  );
  await domainWideDelegationRepository.deleteById({ id });

  return { id };
}
