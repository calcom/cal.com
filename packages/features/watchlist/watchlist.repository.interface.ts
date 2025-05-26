import type { Watchlist } from "./watchlist.model";

export interface IWatchlistRepository {
  getBlockedEmailInWatchlist(email: string): Promise<Watchlist | null>;
}
