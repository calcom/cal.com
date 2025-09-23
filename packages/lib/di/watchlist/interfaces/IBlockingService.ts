export interface BlockingResult {
  isBlocked: boolean;
  reason?: "email" | "domain";
  watchlistEntry?: Record<string, unknown> | null; // Allow null values
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
