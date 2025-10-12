import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import { TRPCError } from "@trpc/server";

import type { TCreateWatchlistEntrySchema } from "./create.schema";

export default async function createHandler(opts: { input: TCreateWatchlistEntrySchema }) {
  const { input } = opts;
  const { services } = await getWatchlistFeature();

  // Validation: If not global, organizationId is required
  if (!input.isGlobal && !input.organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "organizationId is required for organization-scoped entries",
    });
  }

  // Validation: If global, organizationId should not be provided
  if (input.isGlobal && input.organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "organizationId cannot be provided for global entries",
    });
  }

  return await services.watchlistService.createEntry({
    type: input.type,
    value: input.value,
    action: input.action,
    source: input.source,
    isGlobal: input.isGlobal,
    organizationId: input.organizationId ?? null,
    description: input.description,
  });
}
