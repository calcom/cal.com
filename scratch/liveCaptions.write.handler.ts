import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TSetLiveCaptionsInputSchema } from "./liveCaptions.schema";

type SetLiveCaptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetLiveCaptionsInputSchema;
};

/**
 * Persists the liveCaptionsEnabled preference for the authenticated user.
 */
export const setLiveCaptionsHandler = async ({ ctx, input }: SetLiveCaptionsOptions) => {
  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { liveCaptionsEnabled: input.liveCaptionsEnabled },
  });

  return { liveCaptionsEnabled: input.liveCaptionsEnabled };
};
