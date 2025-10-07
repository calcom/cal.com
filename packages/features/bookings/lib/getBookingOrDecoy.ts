import prisma from "@calcom/prisma";

/**
 * Fetches a booking by UID from either the Booking or DecoyBooking table.
 * Returns a unified structure that matches the Booking type so the client
 * cannot distinguish between real and decoy bookings.
 */
export async function getBookingOrDecoyForViewing(uid: string) {
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

  const decoyBooking = await prisma.decoyBooking.findUnique({
    where: { uid },
    include: {
      eventType: {
        select: {
          eventName: true,
          slug: true,
          timeZone: true,
          schedulingType: true,
          hideOrganizerEmail: true,
        },
      },
    },
  });

  if (!decoyBooking) {
    return null;
  }

  return {
    id: decoyBooking.id,
    uid: decoyBooking.uid,
    title: decoyBooking.title,
    startTime: decoyBooking.startTime,
    endTime: decoyBooking.endTime,
    location: decoyBooking.location,
    status: decoyBooking.status,
    description: decoyBooking.description,
    metadata: decoyBooking.metadata,
    responses: decoyBooking.responses,
    user: {
      id: -1,
      name: decoyBooking.organizerName,
      email: decoyBooking.organizerEmail,
      username: null,
      timeZone: "UTC",
      avatarUrl: null,
    },
    attendees: decoyBooking.attendees as Array<{
      name: string;
      email: string;
      timeZone: string;
      phoneNumber: string | null;
    }>,
    eventTypeId: decoyBooking.eventTypeId,
    eventType: decoyBooking.eventType,
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
