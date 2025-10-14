import type {
  IAuditRepository,
  CreateWatchlistAuditInput,
  UpdateWatchlistAuditInput,
} from "../interface/IAuditRepository";
import type { IWatchlistAuditService } from "../interface/IAuditService";
import type { WatchlistAudit } from "../types";

type Deps = {
  auditRepository: IAuditRepository;
};

export class WatchlistAuditService implements IWatchlistAuditService {
  constructor(private readonly deps: Deps) {}

  async createAuditEntry(data: CreateWatchlistAuditInput): Promise<WatchlistAudit> {
    return this.deps.auditRepository.create(data);
  }

  async getAuditEntry(id: string): Promise<WatchlistAudit | null> {
    return this.deps.auditRepository.findById(id);
  }

  async getAuditHistory(watchlistId: string): Promise<WatchlistAudit[]> {
    return this.deps.auditRepository.findByWatchlistId(watchlistId);
  }

  async updateAuditEntry(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit> {
    return this.deps.auditRepository.update(id, data);
  }

  async deleteAuditEntry(id: string): Promise<void> {
    return this.deps.auditRepository.delete(id);
  }

  async getAuditEntries(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]> {
    return this.deps.auditRepository.findMany(filters);
  }
}
