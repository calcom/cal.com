import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type InviteCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const inviteCountHandler = async ({ ctx }: InviteCountOptions) => {
  const userId = ctx.user.id;

  const count = await prisma.membership.count({
    where: {
      userId,
      accepted: false,
    },
  });

  return { count };
};

export default inviteCountHandler;
