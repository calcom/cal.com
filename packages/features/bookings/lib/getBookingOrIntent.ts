import { PrismaBookingIntentRepository } from "@calcom/lib/server/repository/PrismaBookingIntentRepository";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

/**
 * Fetches a booking by UID from either the Booking or BookingIntent table.
 * Returns a unified structure that matches the Booking type so the client
 * cannot distinguish between real and blocked bookings.
 */
export async function getBookingOrIntentForViewing(uid: string) {
  const regularBooking = await prisma.booking.findUnique({
    where: { uid },
    select: {
      title: true,
      id: true,
      uid: true,
      description: true,
      customInputs: true,
      smsReminderNumber: true,
      recurringEventId: true,
      startTime: true,
      endTime: true,
      location: true,
      status: true,
      metadata: true,
      cancellationReason: true,
      cancelledBy: true,
      responses: true,
      rejectionReason: true,
      userPrimaryEmail: true,
      fromReschedule: true,
      rescheduled: true,
      rescheduledBy: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timeZone: true,
          avatarUrl: true,
        },
      },
      attendees: {
        select: {
          name: true,
          email: true,
          timeZone: true,
          phoneNumber: true,
        },
        orderBy: {
          id: "asc",
        },
      },
      eventTypeId: true,
      eventType: {
        select: {
          eventName: true,
          slug: true,
          timeZone: true,
          schedulingType: true,
          hideOrganizerEmail: true,
        },
      },
      seatsReferences: {
        select: {
          referenceUid: true,
        },
      },
      tracking: {
        select: {
          utm_source: true,
          utm_medium: true,
          utm_campaign: true,
          utm_term: true,
          utm_content: true,
        },
      },
    },
  });

  if (regularBooking) {
    return regularBooking;
  }

  const bookingIntentRepo = new PrismaBookingIntentRepository(prisma);
  const bookingIntent = await bookingIntentRepo.getByUidForViewing(uid);

  if (!bookingIntent) {
    return null;
  }

  return {
    id: bookingIntent.id,
    uid: bookingIntent.uid,
    title: bookingIntent.title,
    startTime: bookingIntent.startTime,
    endTime: bookingIntent.endTime,
    location: bookingIntent.location,
    status: BookingStatus.ACCEPTED,
    description: bookingIntent.description,
    metadata: bookingIntent.metadata,
    responses: bookingIntent.responses,
    user: {
      id: -1,
      name: bookingIntent.organizerName,
      email: bookingIntent.organizerEmail,
      username: null,
      timeZone: "UTC",
      avatarUrl: null,
    },
    attendees: bookingIntent.attendees,
    eventTypeId: bookingIntent.eventTypeId,
    eventType: bookingIntent.eventType,
    customInputs: null,
    smsReminderNumber: null,
    recurringEventId: null,
    cancellationReason: null,
    cancelledBy: null,
    rejectionReason: null,
    userPrimaryEmail: null,
    fromReschedule: null,
    rescheduled: false,
    rescheduledBy: null,
    seatsReferences: [],
    tracking: null,
  };
}
