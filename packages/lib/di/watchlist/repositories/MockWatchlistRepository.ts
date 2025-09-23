import type {
  IWatchlistRepository,
  CreateWatchlistInput,
  UpdateWatchlistInput,
} from "../interfaces/IWatchlistRepositories";
import { WatchlistSeverity } from "../types";
import type { Watchlist } from "../types";

export class MockFeaturesRepository implements IWatchlistRepository {
  private mockWatchlist: Watchlist[] = [];

  async findBlockedEntry(_email: string, _organizationId?: number): Promise<Watchlist | null> {
    return null;
  }

  async findBlockedDomain(_domain: string, _organizationId?: number): Promise<Watchlist | null> {
    return null;
  }

  async listByOrganization(_organizationId: number): Promise<Watchlist[]> {
    return [];
  }

  async getBlockedEmailInWatchlist(_email: string): Promise<Watchlist | null> {
    return null;
  }

  async getFreeEmailDomainInWatchlist(_emailDomain: string): Promise<Watchlist | null> {
    return null;
  }

  async searchForAllBlockedRecords(_params: {
    usernames: string[];
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]> {
    return [];
  }

  async createEntry(data: CreateWatchlistInput): Promise<Watchlist> {
    const entry: Watchlist = {
      id: `mock-${Date.now()}`,
      type: data.type,
      value: data.value,
      description: data.description,
      organizationId: data.organizationId,
      action: data.action ?? WatchlistAction.BLOCK,
      severity: WatchlistSeverity.LOW,
      createdAt: new Date(),
      createdById: data.createdById,
      updatedAt: new Date(),
      updatedById: null,
    };
    this.mockWatchlist.push(entry);
    return entry;
  }

  async deleteEntry(id: string, _organizationId: number): Promise<void> {
    this.mockWatchlist = this.mockWatchlist.filter((entry) => entry.id !== id);
  }

  async updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist> {
    const index = this.mockWatchlist.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error("Entry not found");
    }

    this.mockWatchlist[index] = {
      ...this.mockWatchlist[index],
      ...data,
      updatedAt: new Date(),
    };

    return this.mockWatchlist[index];
  }
}
