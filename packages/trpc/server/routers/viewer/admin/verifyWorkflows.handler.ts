import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminVerifyWorkflowsSchema } from "./verifyWorkflows.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminVerifyWorkflowsSchema;
};

export const verifyWorkflows = async ({ input }: GetOptions) => {
  const { userId } = input;

  await prisma.workflowStep.updateMany({
    where: {
      workflow: {
        userId,
      },
      verifiedAt: null,
    },
    data: {
      verifiedAt: new Date(),
    },
  });
};

export default verifyWorkflows;
