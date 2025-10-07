import type { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

import type { BookingFlowConfig } from "./dto/types";

type BookingEventType = {
  id: number;
  slug: string;
  schedulingType: SchedulingType | null;
  metadata: Record<string, unknown> | null;
  hashedLink?: string;
};

type CreatedBooking = {
  uid: string;
  userId: number | null;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  location: string | null;
};

export interface BookingCreatedPayload {
  booking: CreatedBooking;
  eventType: BookingEventType;
  config: BookingFlowConfig;
  bookingFormData: {
    hashedLink: string | null;
  };
}

export interface BookingRescheduledPayload extends BookingCreatedPayload {
  reschedule: {
    originalBooking: {
      uid: string;
    };
    rescheduleReason: string | null;
    rescheduledBy: string | null;
  };
}
