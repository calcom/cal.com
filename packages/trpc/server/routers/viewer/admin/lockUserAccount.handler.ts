import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminLockUserAccountSchema } from "./lockUserAccount.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminLockUserAccountSchema;
};

const lockUserAccountHandler = async ({ input }: GetOptions) => {
  const { userId, locked } = input;

  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      locked,
    },
  });

  // Verify unlocked user's workflows
  if (!locked) {
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
  }

  if (!user) {
    throw new Error("User not found");
  }

  return {
    success: true,
    userId,
    locked,
  };
};

export default lockUserAccountHandler;
