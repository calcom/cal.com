import type { BookingFlowConfig } from "./dto/types";
import type { BookingStatus } from "@calcom/prisma/enums";

export interface BookingCreatedPayload {
  config: BookingFlowConfig;
  bookingFormData: {
    hashedLink: string | null;
  };
  booking: {
    id: number;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    userId: number | null;
    user?: {
      id: number;
    };
  };
}

// Add more fields here when needed
type BookingRescheduledPayload = BookingCreatedPayload;
