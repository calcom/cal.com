export interface BlockedBookingAttempt {
  email: string;
  organizationId?: number;
  reason: "email" | "domain";
  watchlistEntryId: string;
  eventTypeId?: number;
  bookingData?: Record<string, unknown>; // Original booking attempt data
  timestamp?: Date;
}

export interface BlockingStats {
  organizationId: number;
  totalBlockedAttempts: number;
  blockedByEmail: number;
  blockedByDomain: number;
  recentAttempts: BlockedBookingAttempt[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface IAuditService {
  logBlockedBookingAttempt(data: BlockedBookingAttempt): Promise<void>;
  getBlockingStats(organizationId: number, dateRange?: { from: Date; to: Date }): Promise<BlockingStats>;
}
