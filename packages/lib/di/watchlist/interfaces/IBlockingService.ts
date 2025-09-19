export interface BlockingResult {
  isBlocked: boolean;
  reason?: "email" | "domain";
  watchlistEntry?: Record<string, unknown>; // TODO: properly type later, once we have WatchList model updated for Blocking
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
  createDecoyResponse(bookingData: BookingData): Promise<DecoyBookingResponse>;
}
