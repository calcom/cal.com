import type { WatchlistType, WatchlistAction, WatchlistSource } from "@calcom/prisma/enums";

export interface WatchlistEntry {
  id: string;
  type: WatchlistType;
  value: string;
  action: WatchlistAction;
  description: string | null;
  organizationId: number | null;
  isGlobal: boolean;
  source: WatchlistSource;
}

export interface CreateWatchlistInput {
  type: WatchlistType;
  value: string;
  organizationId: number;
  action: WatchlistAction;
  description?: string;
  userId: number;
}

export interface CheckWatchlistInput {
  type: WatchlistType;
  value: string;
  organizationId: number;
}

export interface IWatchlistRepository {
  createEntry(params: CreateWatchlistInput): Promise<{ id: string }>;
  checkExists(params: CheckWatchlistInput): Promise<WatchlistEntry | null>;
}
