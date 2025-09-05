import { _WatchlistModel } from "@calcom/prisma/zod/watchlist";
import type { z } from "zod";

export const WatchlistModelSchema = _WatchlistModel.pick({
  id: true,
  type: true,
  value: true,
  description: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
});

export type Watchlist = z.infer<typeof WatchlistModelSchema>;

export const insertWatchlistSchema = WatchlistModelSchema.pick({
  type: true,
  value: true,
  description: true,
});
