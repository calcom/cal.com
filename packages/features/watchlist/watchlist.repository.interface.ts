import type { Watchlist } from "./watchlist.model";

export interface IWatchlistRepository {
  getEmailInWatchlist(email: string): Promise<Watchlist | null>;
}
