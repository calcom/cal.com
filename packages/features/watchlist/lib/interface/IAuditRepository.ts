import type { WatchlistAction, WatchlistAudit, WatchlistType } from "../types";

export interface CreateWatchlistAuditInput {
  type: WatchlistType;
  value: string;
  description?: string | null;
  action: WatchlistAction;
  changedByUserId?: number | null;
  watchlistId: string;
}

export interface UpdateWatchlistAuditInput {
  type?: WatchlistType;
  value?: string;
  description?: string | null;
  action?: WatchlistAction;
  changedByUserId?: number | null;
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
