import { TRPCError } from "@trpc/server";

import { PolicyService } from "@calcom/features/policies/lib/service/policy.service";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TAcceptPolicySchema } from "./schemas";

type AcceptPolicyOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TAcceptPolicySchema;
};

export const acceptPolicyHandler = async ({ ctx, input }: AcceptPolicyOptions) => {
  const { prisma, user } = ctx;

  // Verify that the policy version exists
  const policyVersion = await prisma.policyVersion.findUnique({
    where: {
      version_type: {
        version: input.version,
        type: input.type,
      },
    },
  });

  if (!policyVersion) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Policy version not found",
    });
  }

  // Use service layer for business logic
  const policyService = new PolicyService();
  const result = await policyService.acceptPolicy(user.id, input.version, input.type);

  return {
    success: result.success,
    acceptedAt: result.acceptedAt,
  };
};

export default acceptPolicyHandler;
