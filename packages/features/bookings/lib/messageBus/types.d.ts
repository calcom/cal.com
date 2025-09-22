import type { Message } from "@calcom/lib/messageBus/MessageBus";
import type { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

import type { BookingFlowConfig } from "../dto/types";

type CreatedBooking = {
  uid: string;
  userId: number | null;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  location: string | null;
};

type BookingEventType = {
  id: number;
  slug: string;
  schedulingType: SchedulingType | null;
  metadata: Record<string, unknown> | null;
  hashedLink?: string;
};

export interface BookingCreationPayload {
  booking: CreatedBooking;
  eventType: BookingEventType;
  config: BookingFlowConfig;
}

export type BookingCreatedMessagePayload = BookingCreationPayload;

export interface BookingRescheduledMessagePayload extends BookingCreatedMessagePayload {
  reschedule: {
    originalBooking: {
      uid: string;
    };
    rescheduleReason: string | null;
    rescheduledBy: string | null;
  };
}

export type BookingCreatedMessage = Message<BookingCreatedMessagePayload>;

export type BookingRescheduledMessage = Message<BookingRescheduledMessagePayload>;

// export interface BookingRequestedMessagePayload extends BookingCreationPayload {
//   // Core booking information
//   booking: {
//     id: number;
//     uid: string;
//     userId: number;
//     status: BookingStatus;
//     startTime: Date;
//     endTime: Date;
//     location: string | null;
//     metadata: Record<string, any> | null;
//     eventTypeId: number | null;
//   };

//   eventType: {
//     id: number;
//     slug: string;
//     schedulingType: string | null;
//     hosts: any[];
//     metadata: Record<string, any> | null;
//     isTeamEventType?: boolean;
//     teamId?: number | null;
//     hashedLink?: string;
//     seatsPerTimeSlot?: number | null;
//   };

//   calendarEvent: CalendarEvent;

//   // Platform and execution context
//   context: {
//     platformClientId?: string;
//     noEmail?: boolean;
//     isDryRun: boolean;
//   };

//   // User and organization context
//   organizer: {
//     id: number;
//   };

//   // Integration and platform data
//   integrations?: {
//     credentials?: any[];
//   };

//   // Form submission and user input data
//   formData?: any;

//   // Calendar and conferencing app sync data from EventManager
//   appSync?: {
//     additionalInformation?: any;
//   };

//   // Routing and assignment specific data
//   routing?: {
//     contactOwnerEmail?: string | null;
//     routingFormResponseId?: number;
//     crmRecordId?: string;
//     reroutingFormResponses?: any;
//     assignmentReason?: {
//       reasonEnum: AssignmentReasonEnum;
//       reasonString: string;
//     };
//   };
// }

export const BOOKING_MESSAGES = {
  BOOKING_CREATED: "booking.created",
  BOOKING_RESCHEDULED: "booking.rescheduled",
  BOOKING_REQUESTED: "booking.requested",
} as const;

export type BookingMessage = (typeof BOOKING_MESSAGES)[keyof typeof BOOKING_MESSAGES];

// Placeholder type for booking requested - to be implemented
export type BookingRequestedMessagePayload = BookingCreationPayload;

export interface BookingMessagePayloadMap {
  [BOOKING_MESSAGES.BOOKING_CREATED]: BookingCreatedMessagePayload;
  [BOOKING_MESSAGES.BOOKING_RESCHEDULED]: BookingRescheduledMessagePayload;
  [BOOKING_MESSAGES.BOOKING_REQUESTED]: BookingRequestedMessagePayload;
}
