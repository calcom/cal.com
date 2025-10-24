import type { WatchlistEntry, CreateWatchlistEntryData, UpdateWatchlistEntryData } from "../types";

export interface IWatchlistService {
  createEntry(data: CreateWatchlistEntryData): Promise<WatchlistEntry>;
  updateEntry(id: string, data: UpdateWatchlistEntryData): Promise<WatchlistEntry>;
  deleteEntry(id: string): Promise<void>;
  getEntry(id: string): Promise<WatchlistEntry | null>;
  listAllSystemEntries(): Promise<WatchlistEntry[]>;
}
