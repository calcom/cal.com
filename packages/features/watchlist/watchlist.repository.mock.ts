import { WatchlistType } from "@calcom/prisma/enums";

import type { IWatchlistRepository } from "./watchlist.repository.interface";

export class MockFeaturesRepository implements IWatchlistRepository {
  async getEmailInWatchlist(email: string) {
    if (email !== "watchlisted@example.com") return null;
    return {
      id: "1",
      type: WatchlistType.EMAIL,
      value: "watchlisted@example.com",
      description: "This is a watchlisted email",
      createdAt: new Date(),
      createdById: 1,
      updatedAt: new Date(),
      updatedById: 1,
    };
  }
}
