import type { BookingFlowConfig } from "./dto/types";

export interface BookingCreatedPayload {
  config: BookingFlowConfig;
  bookingFormData: {
    hashedLink: string | null;
  };
  booking: {
    id: number;
    startTime: Date;
    userId: number | null;
    user?: {
      id: number;
    };
  };
}

// Add more fields here when needed
type BookingRescheduledPayload = BookingCreatedPayload;
