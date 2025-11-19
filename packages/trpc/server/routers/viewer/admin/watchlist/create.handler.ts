import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TCreateWatchlistEntryInputSchema } from "./create.schema";

type CreateWatchlistEntryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateWatchlistEntryInputSchema;
};

export const createWatchlistEntryHandler = async ({ ctx, input }: CreateWatchlistEntryOptions) => {
  const { user } = ctx;
  const service = getAdminWatchlistOperationsService();

  try {
    return await service.createWatchlistEntry({
      type: input.type,
      value: input.value,
      description: input.description,
      userId: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("Invalid email") || message.includes("Invalid domain") || message.includes("already exists")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message,
      });
    }

    throw error;
  }
};

export default createWatchlistEntryHandler;
