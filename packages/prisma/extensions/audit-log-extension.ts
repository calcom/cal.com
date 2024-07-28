import { Prisma } from "@prisma/client";

import saveAuditLog from "@calcom/features/audit-log/saveAuditLog";
import saveFieldSubstituters from "@calcom/features/audit-log/saveFieldSubstituters";
import type { BookingWithAttendees } from "@calcom/features/audit-log/types/BookingAuditLogTypes";
import { BookingAuditLogOption } from "@calcom/features/audit-log/types/BookingAuditLogTypes";
import { EventTypeAuditLogOption } from "@calcom/features/audit-log/types/EventTypeAuditLogTypes";
import { FieldSubstituterOption } from "@calcom/features/audit-log/types/TFieldSubstituterInput";
import { prisma } from "@calcom/prisma";
import type { EventType, Booking, User, Team } from "@calcom/prisma/client";

function auditLogExtension() {
  return Prisma.defineExtension({
    query: {
      user: {
        async update({ args, query }) {
          let returnUpdatedUser;
          if (args.data.email) {
            const prevUser = (await prisma.user.findUnique({ where: args.where })) as User;
            returnUpdatedUser = await query(args);
            const updatedUser = (await prisma.user.findUnique({ where: args.where })) as User;
            saveFieldSubstituters({
              triggeredEvent: FieldSubstituterOption.UserUpdate,
              prevUser,
              updatedUser,
            });
          } else await query(args);
          return returnUpdatedUser;
        },
        async delete({ args, query }) {
          const deletedUser = (await query(args)) as User;
          saveFieldSubstituters({
            triggeredEvent: FieldSubstituterOption.UserDelete,
            deletedUser,
          });
          return deletedUser;
        },
      },
      eventType: {
        async create({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          const createdEventType = (await query(args)) as EventType;
          if (typeof actorUserId === "number") {
            saveAuditLog({
              triggeredEvent: EventTypeAuditLogOption.EventTypeCreate,
              actorUserId,
              createdEventType,
            });
          }
          return createdEventType;
        },
        async update({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          let returnUpdatedEventType;
          if (typeof actorUserId === "number") {
            const prevEventType = (await prisma.eventType.findUnique({ where: args.where })) as EventType;
            returnUpdatedEventType = await query(args);
            const updatedEventType = (await prisma.eventType.findUnique({ where: args.where })) as EventType;
            saveAuditLog({
              triggeredEvent: EventTypeAuditLogOption.EventTypeUpdate,
              actorUserId,
              prevEventType,
              updatedEventType,
            });
          } else returnUpdatedEventType = await query(args);
          return returnUpdatedEventType;
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
            returnUpdatedEventTypes = await query(args);
            const updatedEventTypes = (await prisma.eventType.findMany({
              where: args.where,
              orderBy: { id: "asc" },
            })) as EventType[];
            saveAuditLog({
              triggeredEvent: EventTypeAuditLogOption.EventTypeUpdateMany,
              actorUserId,
              prevEventTypes,
              updatedEventTypes,
            });
          } else returnUpdatedEventTypes = await query(args);
          return returnUpdatedEventTypes;
        },
        async delete({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          const deletedEventType = (await query(args)) as EventType;
          if (typeof actorUserId === "number")
            saveAuditLog({
              triggeredEvent: EventTypeAuditLogOption.EventTypeDelete,
              actorUserId,
              deletedEventType,
            });
          saveFieldSubstituters({
            triggeredEvent: FieldSubstituterOption.EventTypeDelete,
            deletedEventType,
          });
          return deletedEventType;
        },
        async deleteMany({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          let returnEventTypesResponse;
          let deletedEventTypes;
          if (typeof actorUserId === "number") {
            deletedEventTypes = (await prisma.eventType.findMany({
              where: args.where,
              orderBy: { id: "asc" },
            })) as EventType[];
            returnEventTypesResponse = await query(args);
            saveAuditLog({
              triggeredEvent: EventTypeAuditLogOption.EventTypeDeleteMany,
              actorUserId,
              deletedEventTypes,
            });
          } else returnEventTypesResponse = await query(args);
          saveFieldSubstituters({
            triggeredEvent: FieldSubstituterOption.EventTypeDeleteMany,
            deletedEventTypes: deletedEventTypes as EventType[],
          });
          return returnEventTypesResponse;
        },
      },
      booking: {
        async create({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          let createdBooking;
          if (typeof actorUserId === "number") {
            createdBooking = (await query(args)) as Booking;
            saveAuditLog({
              triggeredEvent: BookingAuditLogOption.BookingCreate,
              actorUserId,
              createdBooking,
            });
          } else createdBooking = await query(args);
          return createdBooking;
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
            updatedBooking = await query(args);
            const updatedBookingWithAttendees = (await prisma.booking.findUnique({
              where: args.where,
              include: { attendees: true },
            })) as BookingWithAttendees;
            saveAuditLog({
              triggeredEvent: BookingAuditLogOption.BookingUpdate,
              actorUserId,
              prevBookingWithAttendees,
              updatedBookingWithAttendees,
            });
          } else updatedBooking = await query(args);
          return updatedBooking;
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
            updatedBookings = await query(args);
            const updatedBookingsWithAttendees = (await prisma.booking.findMany({
              where: args.where,
              orderBy: { id: "asc" },
              include: { attendees: true },
            })) as BookingWithAttendees[];
            saveAuditLog({
              triggeredEvent: BookingAuditLogOption.BookingUpdateMany,
              actorUserId,
              prevBookingsWithAttendees,
              updatedBookingsWithAttendees,
            });
          } else updatedBookings = await query(args);
          return updatedBookings;
        },
      },
      team: {
        async delete({ args, query }) {
          const deletedTeam = (await query(args)) as Team;
          saveFieldSubstituters({
            triggeredEvent: FieldSubstituterOption.TeamDelete,
            deletedTeam,
          });
          return deletedTeam;
        },
      },
    },
  });
}

export default auditLogExtension;
