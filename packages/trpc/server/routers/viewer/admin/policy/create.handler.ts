import { PolicyRepository } from "@calcom/features/policies/lib/repository/policy.repository";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCreatePolicyVersionSchema } from "./schemas";

type CreatePolicyVersionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCreatePolicyVersionSchema;
};

export const createPolicyVersionHandler = async ({ ctx, input }: CreatePolicyVersionOptions) => {
  const { prisma, user } = ctx;

  const policyRepository = new PolicyRepository(prisma);

  // Create the policy version using repository
  const policyVersion = await policyRepository.createPolicyVersion(
    {
      type: input.type,
      version: input.version,
      description: input.description,
      descriptionNonUS: input.descriptionNonUS,
    },
    user.id
  );

  return {
    version: policyVersion.version,
    type: policyVersion.type,
    publishedAt: policyVersion.publishedAt,
    description: policyVersion.description,
    descriptionNonUS: policyVersion.descriptionNonUS,
  };
};

export default createPolicyVersionHandler;
