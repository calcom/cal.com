import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";

export const listFavoritesHandler = async ({
  ctx,
}: {
  ctx: { user: NonNullable<TrpcSessionUser> };
}) => {
  const rows = await prisma.favoriteEventType.findMany({
    where: { userId: ctx.user.id },
    select: { eventTypeId: true },
  });
  return rows.map((r) => r.eventTypeId);
};
