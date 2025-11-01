import type { BookingStatus } from "@calcom/prisma/enums";

import type { BookingFlowConfig } from "./dto/types";

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
    } | null;
  };
}

// Add more fields here when needed
type BookingRescheduledPayload = BookingCreatedPayload;
