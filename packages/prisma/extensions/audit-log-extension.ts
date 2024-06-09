import { Prisma } from "@prisma/client";

import saveAuditLogWorker from "@calcom/features/audit-log/saveAuditLogWorker";
import type { BookingWithAttendees } from "@calcom/features/audit-log/types/BookingAuditLogTypes";
import { BookingAuditLogOption } from "@calcom/features/audit-log/types/BookingAuditLogTypes";
import { EventTypeAuditLogOption } from "@calcom/features/audit-log/types/EventTypeAuditLogTypes";
import { prisma } from "@calcom/prisma";
import type { EventType, Booking } from "@calcom/prisma/client";

function auditLogExtension() {
  return Prisma.defineExtension({
    query: {
      eventType: {
        async create({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          const createdEventType = (await query(args)) as EventType; //
          if (typeof actorUserId === "number") {
            saveAuditLogWorker({
              triggeredEvent: EventTypeAuditLogOption.EventTypeCreate,
              actorUserId,
              createdEventType,
            });
          }
          return createdEventType; //
        },
        async update({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          let returnUpdatedEventType;
          if (typeof actorUserId === "number") {
            const prevEventType = (await prisma.eventType.findUnique({ where: args.where })) as EventType;
            returnUpdatedEventType = await query(args); //
            const updatedEventType = (await prisma.eventType.findUnique({ where: args.where })) as EventType;
            saveAuditLogWorker({
              triggeredEvent: EventTypeAuditLogOption.EventTypeUpdate,
              actorUserId,
              prevEventType,
              updatedEventType,
            });
          } else returnUpdatedEventType = await query(args); //
          return returnUpdatedEventType; //
        },
        async updateMany({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          let returnUpdatedEventTypes;
          if (typeof actorUserId === "number") {
            const prevEventTypes = (await prisma.eventType.findMany({
              where: args.where,
              orderBy: { id: "asc" },
            })) as EventType[];
            returnUpdatedEventTypes = await query(args); //
            const updatedEventTypes = (await prisma.eventType.findMany({
              where: args.where,
              orderBy: { id: "asc" },
            })) as EventType[];
            saveAuditLogWorker({
              triggeredEvent: EventTypeAuditLogOption.EventTypeUpdateMany,
              actorUserId,
              prevEventTypes,
              updatedEventTypes,
            });
          } else returnUpdatedEventTypes = await query(args); //
          return returnUpdatedEventTypes; //
        },
        async delete({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          const deletedEventType = (await query(args)) as EventType; //
          if (typeof actorUserId === "number")
            saveAuditLogWorker({
              triggeredEvent: EventTypeAuditLogOption.EventTypeDelete,
              actorUserId,
              deletedEventType,
            });
          return deletedEventType; //
        },
        async deleteMany({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          let returnEventTypesResponse;
          if (typeof actorUserId === "number") {
            const deletedEventTypes = (await prisma.eventType.findMany({
              where: args.where,
              orderBy: { id: "asc" },
            })) as EventType[];
            returnEventTypesResponse = await query(args); //
            saveAuditLogWorker({
              triggeredEvent: EventTypeAuditLogOption.EventTypeDeleteMany,
              actorUserId,
              deletedEventTypes,
            });
          } else returnEventTypesResponse = await query(args); //
          return returnEventTypesResponse; //
        },
      },
      booking: {
        async create({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          let createdBooking;
          if (typeof actorUserId === "number") {
            createdBooking = (await query(args)) as Booking; //
            saveAuditLogWorker({
              triggeredEvent: BookingAuditLogOption.BookingCreate,
              actorUserId,
              createdBooking,
            });
          } else createdBooking = await query(args); //
          return createdBooking; //
        },
        async update({ args, query }) {
          const actorUserId = args.data.actorUserId;
          args.data.actorUserId = null;
          let updatedBooking;
          if (typeof actorUserId === "number") {
            const prevBookingWithAttendees = (await prisma.booking.findUnique({
              where: args.where,
              include: { attendees: true },
            })) as BookingWithAttendees;
            updatedBooking = await query(args); //
            const updatedBookingWithAttendees = (await prisma.booking.findUnique({
              where: args.where,
              include: { attendees: true },
            })) as BookingWithAttendees;
            saveAuditLogWorker({
              triggeredEvent: BookingAuditLogOption.BookingUpdate,
              actorUserId,
              prevBookingWithAttendees,
              updatedBookingWithAttendees,
            });
          } else updatedBooking = await query(args);
          return updatedBooking; //
        },
        async updateMany({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          let updatedBookings;
          if (typeof actorUserId === "number") {
            const prevBookingsWithAttendees = (await prisma.booking.findMany({
              where: args.where,
              orderBy: { id: "asc" },
              include: { attendees: true },
            })) as BookingWithAttendees[];
            updatedBookings = await query(args); //
            const updatedBookingsWithAttendees = (await prisma.booking.findMany({
              where: args.where,
              orderBy: { id: "asc" },
              include: { attendees: true },
            })) as BookingWithAttendees[];
            saveAuditLogWorker({
              triggeredEvent: BookingAuditLogOption.BookingUpdateMany,
              actorUserId,
              prevBookingsWithAttendees,
              updatedBookingsWithAttendees,
            });
          } else updatedBookings = await query(args); //
          return updatedBookings;
        },
      },
    },
  });
}

export default auditLogExtension;
