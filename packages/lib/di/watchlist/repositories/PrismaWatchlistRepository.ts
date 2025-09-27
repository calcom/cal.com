import type {
  IWatchlistRepository,
  IWatchlistReadRepository,
  IWatchlistWriteRepository,
  CreateWatchlistInput,
  UpdateWatchlistInput,
} from "../interfaces/IWatchlistRepositories";
import type { Watchlist } from "../types";

export class PrismaWatchlistRepository implements IWatchlistRepository {
  constructor(
    private readonly readRepo: IWatchlistReadRepository,
    private readonly writeRepo: IWatchlistWriteRepository
  ) {}

  // Read operations - delegate to read repository
  async findBlockedEntry(email: string, organizationId?: number): Promise<Watchlist | null> {
    return this.readRepo.findBlockedEntry(email, organizationId);
  }

  async findBlockedDomain(domain: string, organizationId?: number): Promise<Watchlist | null> {
    return this.readRepo.findBlockedDomain(domain, organizationId);
  }

  async listByOrganization(organizationId: number): Promise<Watchlist[]> {
    return this.readRepo.listByOrganization(organizationId);
  }

  async getBlockedEmailInWatchlist(email: string): Promise<Watchlist | null> {
    return this.readRepo.getBlockedEmailInWatchlist(email);
  }

  async getFreeEmailDomainInWatchlist(emailDomain: string): Promise<Watchlist | null> {
    return this.readRepo.getFreeEmailDomainInWatchlist(emailDomain);
  }

  async searchForAllBlockedRecords(params: {
    usernames: string[];
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]> {
    return this.readRepo.searchForAllBlockedRecords(params);
  }

  // Write operations - delegate to write repository
  async createEntry(data: CreateWatchlistInput): Promise<Watchlist> {
    return this.writeRepo.createEntry(data);
  }

  async deleteEntry(id: string, organizationId: number): Promise<void> {
    return this.writeRepo.deleteEntry(id, organizationId);
  }

  async updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist> {
    return this.writeRepo.updateEntry(id, data);
  }
}
