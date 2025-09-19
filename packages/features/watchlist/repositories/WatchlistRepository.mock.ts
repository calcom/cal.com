import { WatchlistType } from "@calcom/prisma/enums";

import type { IWatchlistRepository } from "../interfaces/IWatchlistRepository";

export class MockFeaturesRepository implements IWatchlistRepository {
  async getBlockedEmailInWatchlist(email: string) {
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

  async getFreeEmailDomainInWatchlist(emailDomain: string) {
    if (emailDomain !== "example.com") return null;
    return {
      id: "2",
      type: WatchlistType.DOMAIN,
      value: "example.com",
      description: "This is a watchlisted domain",
      createdAt: new Date(),
      createdById: 1,
      updatedAt: new Date(),
      updatedById: 1,
    };
  }

  async searchForAllBlockedRecords(params: { usernames: string[]; emails: string[]; domains: string[] }) {
    const results = [];
    if (params.emails.includes("watchlisted@example.com")) {
      results.push({
        id: "1",
        type: WatchlistType.EMAIL,
        value: "watchlisted@example.com",
        description: "This is a watchlisted email",
        createdAt: new Date(),
        createdById: 1,
        updatedAt: new Date(),
        updatedById: 1,
      });
    }
    return results;
  }
}
