import type { EventType, Booking } from "@calcom/prisma/client";

import type { BookingWithAttendees } from "./BookingAuditLogTypes";
import type { BookingAuditLogOption } from "./BookingAuditLogTypes";
import type { EventTypeAuditLogOption } from "./EventTypeAuditLogTypes";

type TAuditLogInput = {
  actorUserId: number;
} & (
  | { triggeredEvent: typeof EventTypeAuditLogOption.EventTypeCreate; createdEventType: EventType }
  | {
      triggeredEvent: typeof EventTypeAuditLogOption.EventTypeUpdate;
      prevEventType: EventType;
      updatedEventType: EventType;
    }
  | {
      triggeredEvent: typeof EventTypeAuditLogOption.EventTypeUpdateMany;
      prevEventTypes: EventType[];
      updatedEventTypes: EventType[];
    }
  | {
      triggeredEvent: typeof EventTypeAuditLogOption.EventTypeDelete;
      deletedEventType: EventType;
    }
  | { triggeredEvent: typeof EventTypeAuditLogOption.EventTypeDeleteMany; deletedEventTypes: EventType[] }
  | { triggeredEvent: typeof BookingAuditLogOption.BookingCreate; createdBooking: Booking }
  | {
      triggeredEvent: typeof BookingAuditLogOption.BookingUpdate;
      prevBookingWithAttendees: BookingWithAttendees;
      updatedBookingWithAttendees: BookingWithAttendees;
    }
  | {
      triggeredEvent: typeof BookingAuditLogOption.BookingUpdateMany;
      prevBookingsWithAttendees: BookingWithAttendees[];
      updatedBookingsWithAttendees: BookingWithAttendees[];
    }
);

export default TAuditLogInput;
