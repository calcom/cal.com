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
    return await this.auditRepository.create(data);
  }

  async getAuditEntry(id: string): Promise<WatchlistAudit | null> {
    return await this.auditRepository.findById(id);
  }

  async getAuditHistory(watchlistId: string): Promise<WatchlistAudit[]> {
    return await this.auditRepository.findByWatchlistId(watchlistId);
  }

  async updateAuditEntry(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit> {
    return await this.auditRepository.update(id, data);
  }

  async deleteAuditEntry(id: string): Promise<void> {
    return await this.auditRepository.delete(id);
  }

  async getAuditEntries(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]> {
    return await this.auditRepository.findMany(filters);
  }
}
