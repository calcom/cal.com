import type { WatchlistType } from "../types";

export interface BlockingResult {
  isBlocked: boolean;
  reason?: WatchlistType;
  watchlistEntry?: Record<string, unknown> | null;
}

export interface DecoyBookingResponse {
  uid: string;
  success: boolean;
  message: string;
}

export interface BookingData {
  email: string;
  eventTypeId?: number;
  organizationId?: number;
  [key: string]: unknown;
}

export interface IBlockingService {
  isBlocked(email: string, organizationId?: number): Promise<BlockingResult>;
}
