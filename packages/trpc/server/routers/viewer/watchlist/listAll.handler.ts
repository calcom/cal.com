import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";

import type { TListAllWatchlistSchema } from "./listAll.schema";

export default async function listAllHandler(_opts: { input: TListAllWatchlistSchema }) {
  const { controllers } = await getWatchlistFeature();

  return await controllers.listAllSystemEntriesController({
    span: sentrySpan,
  });
}
