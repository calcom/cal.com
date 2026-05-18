import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListPendingInvitesHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
};

export const listPendingInvitesHandler = async ({ ctx }: ListPendingInvitesHandlerOptions) => {
  return prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      accepted: false,
      team: { isOrganization: true },
    },
    select: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};
