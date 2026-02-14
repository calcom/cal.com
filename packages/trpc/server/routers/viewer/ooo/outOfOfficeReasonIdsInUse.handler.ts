import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

/**
 * Returns reason IDs that are used by at least one OOO entry of the current user.
 * Used to block deleting a custom reason that is still in use.
 */
export const outOfOfficeReasonIdsInUse = async ({
  ctx,
}: {
  ctx: { user: NonNullable<TrpcSessionUser> };
}) => {
  const entries = await prisma.outOfOfficeEntry.findMany({
    where: { userId: ctx.user.id, reasonId: { not: null } },
    select: { reasonId: true },
  });
  const ids = [...new Set(entries.map((e) => e.reasonId!).filter(Boolean))];
  return ids;
};
