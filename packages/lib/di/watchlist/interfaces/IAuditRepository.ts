import type { BlockedBooking } from "../types";

export interface CreateBlockedBookingInput {
  email: string;
  organizationId: number;
  watchlistId: string;
  eventTypeId?: number;
  bookingData?: Record<string, unknown>;
}

export interface IAuditRepository {
  createBlockedBookingEntry(data: CreateBlockedBookingInput): Promise<BlockedBooking>;
  getBlockingStats(organizationId: number): Promise<{
    totalBlocked: number;
    blockedByEmail: number;
    blockedByDomain: number;
  }>;
  getBlockedBookingsByOrganization(organizationId: number): Promise<BlockedBooking[]>;
}
