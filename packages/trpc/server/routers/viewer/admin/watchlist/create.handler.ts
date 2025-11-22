import { domainRegex, emailRegex } from "@calcom/lib/emailSchema";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { WatchlistAction } from "@calcom/prisma/enums";

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

  const watchlistRepo = new WatchlistRepository(prisma);

  if (input.type === "EMAIL" && !emailRegex.test(input.value)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid email address format",
    });
  }

  if (input.type === "DOMAIN" && !domainRegex.test(input.value)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid domain format (e.g., example.com)",
    });
  }

  try {
    const entry = await watchlistRepo.createEntry({
      type: input.type,
      value: input.value.toLowerCase(),
      organizationId: null,
      action: WatchlistAction.BLOCK,
      description: input.description,
      userId: user.id,
      isGlobal: true,
    });

    return {
      success: true,
      entry,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This entry already exists in the system blocklist",
      });
    }
    throw error;
  }
};

export default createWatchlistEntryHandler;
