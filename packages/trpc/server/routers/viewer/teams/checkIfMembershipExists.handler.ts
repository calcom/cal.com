import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCheckIfMembershipExistsInputSchema } from "./checkIfMembershipExists.schema";

type CheckIfMembershipExistsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCheckIfMembershipExistsInputSchema;
};

const checkIfMembershipExistsHandler = async ({ input }: CheckIfMembershipExistsOptions) => {
  const { teamId, value } = input;

  const membership = await prisma.membership.findFirst({
    where: {
      teamId,
      user: {
        OR: [
          {
            email: value,
          },
          {
            username: value,
          },
        ],
      },
    },
  });

  return !!membership;
};

export default checkIfMembershipExistsHandler;
