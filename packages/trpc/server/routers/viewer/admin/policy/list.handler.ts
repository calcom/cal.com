import { PolicyRepository } from "@calcom/features/policies/lib/repository/policy.repository";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TListPolicyVersionsSchema } from "./schemas";

type ListPolicyVersionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TListPolicyVersionsSchema;
};

export const listPolicyVersionsHandler = async ({ ctx, input }: ListPolicyVersionsOptions) => {
  const { prisma } = ctx;

  const policyRepository = new PolicyRepository(prisma);

  const result = await policyRepository.listPolicyVersions(input.cursor, input.limit, input.type);

  return {
    policies: result.policies,
    nextCursor: result.nextCursor,
  };
};

export default listPolicyVersionsHandler;
