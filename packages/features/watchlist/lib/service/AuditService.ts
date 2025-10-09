import type {
  IAuditRepository,
  CreateWatchlistAuditInput,
  UpdateWatchlistAuditInput,
} from "../interface/IAuditRepository";
import type { IAuditService } from "../interface/IAuditService";
import type { WatchlistAudit } from "../types";

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async createAuditEntry(data: CreateWatchlistAuditInput): Promise<WatchlistAudit> {
    return this.auditRepository.create(data);
  }

  async getAuditEntry(id: string): Promise<WatchlistAudit | null> {
    return this.auditRepository.findById(id);
  }

  async getAuditHistory(watchlistId: string): Promise<WatchlistAudit[]> {
    return this.auditRepository.findByWatchlistId(watchlistId);
  }

  async updateAuditEntry(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit> {
    return this.auditRepository.update(id, data);
  }

  async deleteAuditEntry(id: string): Promise<void> {
    return this.auditRepository.delete(id);
  }

  async getAuditEntries(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]> {
    return this.auditRepository.findMany(filters);
  }
}
