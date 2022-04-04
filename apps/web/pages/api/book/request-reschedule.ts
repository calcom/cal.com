import { BookingStatus } from "@prisma/client";
import dayjs from "dayjs";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { z, ZodError } from "zod";

import CalendarDirector from "@calcom/core/builders/CalendarEvent/director";

import { sendRequestRescheduleEmail } from "@lib/emails/email-manager";
import OrganizerRequestRescheduledEmail from "@lib/emails/templates/organizer-request-reschedule-email";
import { getEventName } from "@lib/event";
import prisma from "@lib/prisma";

const rescheduleSchema = z.object({
  bookingId: z.string(),
  rescheduleReason: z.string().optional(),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession({ req });
  const { bookingId, rescheduleReason: cancellationReason } = req.body;
  console.log({ bookingId });
  let userOwner;
  try {
    if (session?.user?.id) {
      userOwner = await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          locale: true,
        },
      });
    } else {
      // Throw error
    }

    const bookingToReschedule = await prisma.booking.findFirst({
      select: {
        id: true,
        startTime: true,
        endTime: true,
        userId: true,
        attendees: true,
        eventTypeId: true,
      },
      where: {
        uid: bookingId,
        NOT: {
          status: BookingStatus.CANCELLED,
        },
      },
    });
    if (bookingToReschedule && bookingToReschedule.eventTypeId) {
      const event = await prisma.eventType.findFirst({
        where: {
          id: bookingToReschedule.eventTypeId,
        },
      });
      const updatedBooking = await prisma.booking.update({
        where: {
          id: bookingToReschedule.id,
        },
        data: {
          rescheduled: true,
          cancellationReason,
          status: BookingStatus.CANCELLED,
          updatedAt: dayjs().toISOString(),
        },
      });
      // Soft delete
      await prisma.bookingReference.deleteMany({
        where: {
          bookingId: bookingToReschedule.id,
        },
      });

      // Send email =================

      const eventCalendar = new CalendarDirector().buildRequiredParams({
        booking: bookingToReschedule,
        attendee: bookingToReschedule.attendees,
        start: bookingToReschedule.startTime,
        end: bookingToReschedule.endTime,
        eventName: event?.eventName,
        translationAttendees: userOwner.locale,
        translationGuests: "en_us",
        translationOwner: "en_us",
        eventTypeId: bookingToReschedule.eventTypeId,
        timeZone: event?.timeZone,
        location: event?.locations,
        // notes: "",
        customInputs: [],
      });
      const resultEvent = await eventCalendar.buildRequiredParams();
      if (resultEvent) {
        console.log(resultEvent);
        console.log(resultEvent.attendees);
        console.log(resultEvent.organizer);
        await sendRequestRescheduleEmail(resultEvent);
      }
    }

    return res.status(200).json(bookingToReschedule);
  } catch (error) {
    console.log(error);
    // throw new Error(error?.message);
  }

  return res.status(204);
};

function validate(handler: NextApiHandler) {
  return async (req, res) => {
    if (req.method === "POST") {
      try {
        rescheduleSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError && error?.name === "ZodError") {
          return res.status(400).json(error?.issues);
        }
        return res.status(402);
      }
    } else {
      return res.status(405);
    }
    await handler(req, res);
  };
}

export default validate(handler);
