import { BookingStatus, User, Booking, Attendee } from "@prisma/client";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import type { TFunction } from "next-i18next";
import { z, ZodError } from "zod";

import { CalendarEventBuilder } from "@calcom/core/builders/CalendarEvent/builder";
import { CalendarEventDirector } from "@calcom/core/builders/CalendarEvent/director";
import { getTranslation } from "@calcom/lib/server/i18n";
import { Person } from "@calcom/types/Calendar";

import { sendRequestRescheduleEmail } from "@lib/emails/email-manager";
import prisma from "@lib/prisma";

export type RescheduleResponse = Booking & {
  attendees: Attendee[];
};
export type PersonAttendeeCommonFields = Pick<
  User,
  "id" | "email" | "name" | "locale" | "timeZone" | "username"
>;

const rescheduleSchema = z.object({
  bookingId: z.string(),
  rescheduleReason: z.string().optional(),
});

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<RescheduleResponse | NextApiResponse | void> => {
  const session = await getSession({ req });
  const {
    bookingId,
    rescheduleReason: cancellationReason,
  }: { bookingId: string; rescheduleReason: string; cancellationReason: string } = req.body;
  let userOwner: PersonAttendeeCommonFields | null;
  try {
    if (session?.user?.id) {
      userOwner = await prisma.user.findUnique({
        rejectOnNotFound: true,
        where: {
          id: session.user.id,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          timeZone: true,
          locale: true,
        },
      });
    } else {
      return res.status(501);
    }

    const bookingToReschedule = await prisma.booking.findFirst({
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        eventTypeId: true,
        location: true,
        attendees: true,
      },
      rejectOnNotFound: true,
      where: {
        uid: bookingId,
        NOT: {
          status: {
            in: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
          },
        },
      },
    });

    if (bookingToReschedule && bookingToReschedule.eventTypeId && userOwner) {
      const event = await prisma.eventType.findFirst({
        select: {
          title: true,
          users: true,
          schedulingType: true,
        },
        rejectOnNotFound: true,
        where: {
          id: bookingToReschedule.eventTypeId,
        },
      });
      await prisma.booking.update({
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

      const [mainAttendee] = bookingToReschedule.attendees;
      // @NOTE: Should we assume attendees language?
      const tAttendees = await getTranslation(mainAttendee.locale ?? "en", "common");
      const usersToPeopleType = (
        users: PersonAttendeeCommonFields[],
        selectedLanguage: TFunction
      ): Person[] => {
        return users?.map((user) => {
          return {
            email: user.email || "",
            name: user.name || "",
            username: user?.username || "",
            language: { translate: selectedLanguage, locale: user.locale || "en" },
            timeZone: user?.timeZone,
          };
        });
      };

      const userOwnerTranslation = await getTranslation(userOwner.locale ?? "en", "common");
      const [userOwnerAsPeopleType] = usersToPeopleType([userOwner], userOwnerTranslation);
      // Using builder as assembling calEvent can take some time
      const builder = new CalendarEventBuilder();
      builder.init({
        title: bookingToReschedule.title,
        type: event.title,
        startTime: bookingToReschedule.startTime.toISOString(),
        endTime: bookingToReschedule.endTime.toISOString(),
        attendees: usersToPeopleType(
          // username field doesn't exists on attendee but could be in the future
          bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
          tAttendees
        ),
        organizer: userOwnerAsPeopleType,
      });

      const director = new CalendarEventDirector();
      director.setBuilder(builder);
      director.setExistingBooking(bookingToReschedule as unknown as Booking);
      director.setCancellationReason(cancellationReason);
      director.buildForRescheduleEmail();

      // Send email =================
      await sendRequestRescheduleEmail(builder.calendarEvent, {
        rescheduleLink: builder.rescheduleLink,
      });
    }

    return res.status(200).json(bookingToReschedule);
  } catch (error) {
    throw new Error("Error.request.reschedule");
  }
};

function validate(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<RescheduleResponse | NextApiResponse | void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
