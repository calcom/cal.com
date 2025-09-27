export interface BlockedBookingAttempt {
  email: string;
  organizationId?: number;
  watchlistId: string;
  eventTypeId?: number;
  bookingData?: Record<string, unknown>; // Original booking attempt data
  timestamp?: Date;
}

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
}
