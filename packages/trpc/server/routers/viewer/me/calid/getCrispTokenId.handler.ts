import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getCrispTokenIdHandler = async ({ ctx }: Props) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { crispTokenId: true },
  });

  if (user?.crispTokenId) {
    return { crispTokenId: user.crispTokenId };
  }

  const newTokenId = uuidv4();

  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { crispTokenId: newTokenId },
  });

  return { crispTokenId: newTokenId };
};
