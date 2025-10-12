import { z } from "zod";

// System admin: List all watchlist entries (global + all orgs)
export const ZListAllWatchlistSchema = z.object({});

export type TListAllWatchlistSchema = z.infer<typeof ZListAllWatchlistSchema>;
