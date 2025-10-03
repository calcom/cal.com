export interface BlockingStats {
  totalBlocked: number;
  blockedByEmail: number;
  blockedByDomain: number;
}

export interface IAuditService {
  logBlockedBookingAttempt(data: {
    email: string;
    organizationId?: number;
    watchlistId: string;
    eventTypeId?: number;
    bookingData?: Record<string, unknown>;
  }): Promise<void>;

  getBlockingStats(organizationId: number): Promise<BlockingStats>;

  logWatchlistChange(data: {
    watchlistId: string;
    type: string;
    value: string;
    description?: string;
    action: string;
    changedByUserId?: number;
  }): Promise<void>;
}
