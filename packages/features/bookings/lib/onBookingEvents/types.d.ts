import type { BookingFlowConfig } from "./dto/types";

export interface BookingCreatedPayload {
  config: BookingFlowConfig;
  bookingFormData: {
    hashedLink: string | null;
  };
}

// Add more fields here when needed
type BookingRescheduledPayload = BookingCreatedPayload;
