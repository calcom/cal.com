import { isMainThread, Worker, workerData } from "node:worker_threads";

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

let saveAuditLogWorker: (input: TAuditLogInput) => Promise<void> = async (input: TAuditLogInput) => {
  // Default implementation that does nothing
};

if (isMainThread) {
  saveAuditLogWorker = (input: TAuditLogInput) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: input });
      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  };
} else {
  (async () => {
    console.log(workerData);
    switch (workerData.triggeredEvent) {
      case EventTypeAuditLogOption.EventTypeCreate:
        await saveEventTypeCreate(workerData.actorUserId, workerData.createdEventType as EventType);
        break;
      case EventTypeAuditLogOption.EventTypeUpdate:
        await saveEventTypeUpdate(
          workerData.actorUserId,
          workerData.prevEventType,
          workerData.updatedEventType
        );
        break;
      case EventTypeAuditLogOption.EventTypeUpdateMany:
        await saveEventTypeUpdateMany(
          workerData.actorUserId,
          workerData.prevEventTypes,
          workerData.updatedEventTypes
        );
        break;
      case EventTypeAuditLogOption.EventTypeDelete:
        await saveEventTypeDelete(workerData.actorUserId, workerData.deletedEventType);
        break;
      case EventTypeAuditLogOption.EventTypeDeleteMany:
        await saveEventTypeDeleteMany(workerData.actorUserId, workerData.deletedEventTypes);
        break;
      case BookingAuditLogOption.BookingCreate:
        await saveBookingCreate(workerData.actorUserId, workerData.createdBooking as Booking);
        break;
      case BookingAuditLogOption.BookingUpdate:
        await saveBookingUpdate(
          workerData.actorUserId,
          workerData.prevBookingWithAttendees as BookingWithAttendees,
          workerData.updatedBookingWithAttendees as BookingWithAttendees
        );
        break;
      case BookingAuditLogOption.BookingUpdateMany:
        await saveBookingUpdateMany(
          workerData.actorUserId,
          workerData.prevBookingsWithAttendees as BookingWithAttendees[],
          workerData.updatedBookingsWithAttendees as BookingWithAttendees[]
        );
        break;
      default:
        // console.warn(`Unhandled audit log event type: ${workerData.triggeredEvent}`);
        break;
    }
  })();
}

export default saveAuditLogWorker;
