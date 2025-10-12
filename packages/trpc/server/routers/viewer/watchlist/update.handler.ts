import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { TUpdateWatchlistEntrySchema } from "./update.schema";

export default async function updateHandler(opts: { input: TUpdateWatchlistEntrySchema }) {
  const { input } = opts;
  const { services } = await getWatchlistFeature();

  const { id, ...data } = input;

  return await services.watchlistService.updateEntry(id, data);
}
