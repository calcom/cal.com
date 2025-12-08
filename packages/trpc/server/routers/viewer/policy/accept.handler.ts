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

  console.log("Policy Version:", policyVersion);

  if (!policyVersion) {
    throw new Error("Policy version not found");
  }

  // Use service layer for business logic
  const policyService = new PolicyService(prisma);
  const result = await policyService.acceptPolicy(user.id, input.version, input.type, prisma);

  return {
    success: result.success,
    acceptedAt: result.acceptedAt,
  };
};

export default acceptPolicyHandler;
