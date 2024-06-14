import type { EventType, Booking } from "@calcom/prisma/client";

import type { BookingWithAttendees } from "./types/BookingAuditLogTypes";
import { BookingAuditLogOption } from "./types/BookingAuditLogTypes";
import { EventTypeAuditLogOption } from "./types/EventTypeAuditLogTypes";
import type TAuditLogInput from "./types/TAuditLogInput";
import {
  saveBookingCreate,
  saveBookingUpdate,
  saveBookingUpdateMany,
} from "./util/auditLogSavers/saveBooking";
import {
  saveEventTypeCreate,
  saveEventTypeUpdate,
  saveEventTypeUpdateMany,
  saveEventTypeDelete,
  saveEventTypeDeleteMany,
} from "./util/auditLogSavers/saveEventType";

export default async function saveAuditLog(input: TAuditLogInput) {
  switch (input.triggeredEvent) {
    case EventTypeAuditLogOption.EventTypeCreate:
      await saveEventTypeCreate(input.actorUserId, input.createdEventType as EventType);
      break;
    case EventTypeAuditLogOption.EventTypeUpdate:
      await saveEventTypeUpdate(input.actorUserId, input.prevEventType, input.updatedEventType);
      break;
    case EventTypeAuditLogOption.EventTypeUpdateMany:
      await saveEventTypeUpdateMany(input.actorUserId, input.prevEventTypes, input.updatedEventTypes);
      break;
    case EventTypeAuditLogOption.EventTypeDelete:
      await saveEventTypeDelete(input.actorUserId, input.deletedEventType);
      break;
    case EventTypeAuditLogOption.EventTypeDeleteMany:
      await saveEventTypeDeleteMany(input.actorUserId, input.deletedEventTypes);
      break;
    case BookingAuditLogOption.BookingCreate:
      await saveBookingCreate(input.actorUserId, input.createdBooking as Booking);
      break;
    case BookingAuditLogOption.BookingUpdate:
      await saveBookingUpdate(
        input.actorUserId,
        input.prevBookingWithAttendees as BookingWithAttendees,
        input.updatedBookingWithAttendees as BookingWithAttendees
      );
      break;
    case BookingAuditLogOption.BookingUpdateMany:
      await saveBookingUpdateMany(
        input.actorUserId,
        input.prevBookingsWithAttendees as BookingWithAttendees[],
        input.updatedBookingsWithAttendees as BookingWithAttendees[]
      );
      break;
    default:
      // console.warn(`Unhandled audit log event type: ${input.triggeredEvent}`);
      break;
  }
}
