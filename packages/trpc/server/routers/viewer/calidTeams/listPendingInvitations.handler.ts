import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListPendingInvitationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listPendingInvitationsHandler = async ({ ctx }: ListPendingInvitationsOptions) => {
  const userId = ctx.user.id;

  const pendingInvitations = await prisma.calIdMembership.findMany({
    where: {
      userId,
      acceptedInvitation: false,
    },
  });

  return pendingInvitations;
};
