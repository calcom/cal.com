import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetLiveCaptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

/**
 * Returns the liveCaptionsEnabled setting for the authenticated user.
 * Always resolves to a boolean — never null.
 */
export const getLiveCaptionsHandler = async ({ ctx }: GetLiveCaptionsOptions) => {
  const result = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    select: { liveCaptionsEnabled: true },
  });

  return { liveCaptionsEnabled: result.liveCaptionsEnabled ?? false };
};
