import type { BookingFlowConfig } from "../dto/types";
import type { BookingStatus } from "@calcom/prisma/enums";

export interface BookingCreatedPayload {
  config: BookingFlowConfig;
  bookingFormData: {
    hashedLink: string | null;
  };
  booking: {
    uid: string;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    userId: number | null;
    user?: {
      id: number;
    };
  };
  organizationId: number | null;
}

export interface BookingRescheduledPayload extends BookingCreatedPayload {
  oldBooking: {
    uid: string;
    startTime: Date;
    endTime: Date;
  };
}
