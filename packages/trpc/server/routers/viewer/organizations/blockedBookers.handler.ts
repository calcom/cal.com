import { getWatchlistRepository } from "@calcom/lib/di/watchlist/containers/watchlist";
import { WatchlistAction } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type {
  ListBlockedBookersInput,
  CreateBlockedBookerInput,
  DeleteBlockedBookerInput,
} from "./blockedBookers.schema";

type ListHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ListBlockedBookersInput;
};

type CreateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: CreateBlockedBookerInput;
};

type DeleteHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: DeleteBlockedBookerInput;
};

export const listBlockedBookersHandler = async ({ input }: ListHandlerOptions) => {
  const watchlistRepository = getWatchlistRepository();
  const { organizationId, limit, offset, searchTerm } = input;

  // Get all entries for the organization
  const allEntries = await watchlistRepository.listByOrganization(organizationId);

  // Apply search filter if provided
  let filteredEntries = allEntries;
  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    filteredEntries = allEntries.filter(
      (entry) =>
        entry.value.toLowerCase().includes(lowerSearchTerm) ||
        entry.description?.toLowerCase().includes(lowerSearchTerm)
    );
  }

  // Apply pagination
  const totalRowCount = filteredEntries.length;
  const paginatedEntries = filteredEntries.slice(offset, offset + limit);

  return {
    rows: paginatedEntries,
    meta: {
      totalRowCount,
    },
  };
};

export const createBlockedBookerHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const watchlistRepository = getWatchlistRepository();

  // Validate email format for EMAIL type
  if (input.type === "EMAIL") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid email format",
      });
    }
  }

  // Validate domain format for DOMAIN type
  if (input.type === "DOMAIN") {
    if (!input.value.startsWith("@") || input.value.length < 3) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Domain must start with @ and be at least 3 characters long",
      });
    }
  }

  return await watchlistRepository.createEntry({
    type: input.type,
    value: input.value,
    description: input.description,
    organizationId: input.organizationId,
    action: WatchlistAction.BLOCK,
    createdById: ctx.user.id,
  });
};

export const deleteBlockedBookerHandler = async ({ input }: DeleteHandlerOptions) => {
  const watchlistRepository = getWatchlistRepository();
  await watchlistRepository.deleteEntry(input.entryId, input.organizationId);
  return { success: true };
};
