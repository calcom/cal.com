import {
  BookingCreateAuditLogger,
  BookingUpdateAuditLogger,
} from "@calcom/features/audit-log/bookingAuditLogger";
import type { BookingWithAttendees } from "@calcom/features/audit-log/types/BookingAuditLogTypes";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";

export async function saveBookingCreate(actorUserId: number, createdBooking: Booking) {
  if (createdBooking?.eventTypeId) {
    const eventType = await prisma.eventType.findUnique({
      where: { id: createdBooking?.eventTypeId },
    });
    if (eventType?.teamId) {
      const BookingWithAttendees = await prisma.booking.findUnique({
        where: { id: createdBooking.id },
        include: { attendees: true },
      });
      const bookingCreateAuditLogger = new BookingCreateAuditLogger(
        actorUserId,
        BookingWithAttendees as BookingWithAttendees,
        eventType.teamId
      );
      await bookingCreateAuditLogger.log();
    }
  }
}

export async function saveBookingUpdate(
  actorUserId: number,
  prevBookingWithAttendees: BookingWithAttendees,
  updatedBookingWithAttendees: BookingWithAttendees
) {
  if (updatedBookingWithAttendees?.eventTypeId) {
    const eventType = await prisma.eventType.findUnique({
      where: { id: updatedBookingWithAttendees?.eventTypeId },
    });
    if (eventType?.teamId) {
      const bookingUpdateAuditLogger = new BookingUpdateAuditLogger(
        actorUserId,
        prevBookingWithAttendees,
        updatedBookingWithAttendees,
        eventType?.teamId
      );
      await bookingUpdateAuditLogger.log();
    }
  }
}

export async function saveBookingUpdateMany(
  actorUserId: number,
  prevBookingsWithAttendees: BookingWithAttendees[],
  updatedBookingsWithAttendees: BookingWithAttendees[]
) {
  for (let i = 0; i < prevBookingsWithAttendees.length; i++) {
    const eventTypeId = updatedBookingsWithAttendees[i]?.eventTypeId;
    if (eventTypeId) {
      const eventType = await prisma.eventType.findUnique({
        where: { id: eventTypeId },
      });
      if (eventType?.teamId) {
        const bookingUpdateAuditLogger = new BookingUpdateAuditLogger(
          actorUserId,
          prevBookingsWithAttendees[i] as BookingWithAttendees,
          updatedBookingsWithAttendees[i] as BookingWithAttendees,
          eventType?.teamId
        );
        await bookingUpdateAuditLogger.log();
      }
    }
  }
}
