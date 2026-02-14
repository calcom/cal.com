import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const outOfOfficeReasonList = async ({ ctx }: { ctx: { user: NonNullable<TrpcSessionUser> } }) => {
  const currentUserId = ctx.user?.id;
  // Only system reasons (userId null) + current user's custom reasons (userId = currentUserId)
  const reasons = await prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
      OR: [{ userId: null }, ...(typeof currentUserId === "number" ? [{ userId: currentUserId }] : [])],
    },
    orderBy: [{ userId: "asc" }, { id: "asc" }],
  });
  return reasons;
};
