import type { z } from "zod";

import { WatchlistSchema } from "@calcom/prisma/zod/modelSchema/WatchlistSchema";

export const WatchlistModelSchema = WatchlistSchema.pick({
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
