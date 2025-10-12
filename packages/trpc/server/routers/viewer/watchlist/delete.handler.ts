import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { TDeleteWatchlistEntrySchema } from "./delete.schema";

export default async function deleteHandler(opts: { input: TDeleteWatchlistEntrySchema }) {
  const { input } = opts;
  const { services } = await getWatchlistFeature();

  await services.watchlistService.deleteEntry(input.id);

  return { success: true };
}
