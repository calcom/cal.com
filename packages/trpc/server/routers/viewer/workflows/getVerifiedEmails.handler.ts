import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";

type GetVerifiedEmailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetVerifiedEmailsInputSchema;
};

export const getVerifiedEmailsHandler = async ({ ctx, input }: GetVerifiedEmailsOptions) => {
  const { user } = ctx;
  const verifiedEmails = await prisma.verifiedEmail.findMany({
    where: {
      OR: [{ userId: user.id }, { teamId: input.teamId }],
    },
  });

  return verifiedEmails;
};
