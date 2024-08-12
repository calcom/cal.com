import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TValidateUniqueInviteInputSchema } from "./validateUniqueInvite.schema";

type ValidateUniqueInviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TValidateUniqueInviteInputSchema;
};

const validateUniqueInviteHandler = async ({ ctx, input }: ValidateUniqueInviteOptions) => {
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

  return { doesInviteExists: !!membership };
};

export default validateUniqueInviteHandler;
