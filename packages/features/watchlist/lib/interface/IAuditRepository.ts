import type { WatchlistAudit } from "../types";

export interface CreateWatchlistAuditInput {
  type: string;
  value: string;
  description?: string;
  action: string;
  changedByUserId?: number;
  watchlistId: string;
}

export interface UpdateWatchlistAuditInput {
  type?: string;
  value?: string;
  description?: string;
  action?: string;
  changedByUserId?: number;
}

export interface IAuditRepository {
  // Basic CRUD operations for WatchlistAudit table
  create(data: CreateWatchlistAuditInput): Promise<WatchlistAudit>;
  findById(id: string): Promise<WatchlistAudit | null>;
  findByWatchlistId(watchlistId: string): Promise<WatchlistAudit[]>;
  update(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit>;
  delete(id: string): Promise<void>;
  findMany(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]>;
}
