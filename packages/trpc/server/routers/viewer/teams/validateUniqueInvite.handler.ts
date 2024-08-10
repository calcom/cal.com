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

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      members: {
        some: {
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
      },
    },
  });

  return { doesInviteExists: !!team };
};

export default validateUniqueInviteHandler;
