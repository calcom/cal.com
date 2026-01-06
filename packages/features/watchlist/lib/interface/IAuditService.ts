import type { WatchlistAudit } from "../types";
import type { CreateWatchlistAuditInput, UpdateWatchlistAuditInput } from "./IAuditRepository";

export interface IWatchlistAuditService {
  // Basic CRUD operations for WatchlistAudit
  createAuditEntry(data: CreateWatchlistAuditInput): Promise<WatchlistAudit>;
  getAuditEntry(id: string): Promise<WatchlistAudit | null>;
  getAuditHistory(watchlistId: string): Promise<WatchlistAudit[]>;
  updateAuditEntry(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit>;
  deleteAuditEntry(id: string): Promise<void>;
  getAuditEntries(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]>;
}
