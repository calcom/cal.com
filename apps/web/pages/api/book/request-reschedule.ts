import { BookingStatus, User, SchedulingType } from "@prisma/client";
import dayjs from "dayjs";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import type { TFunction } from "next-i18next";
import { z, ZodError } from "zod";

import { CalendarEventBuilder } from "@calcom/core/builders/CalendarEvent/builder";
import { CalendarEventClass } from "@calcom/core/builders/CalendarEvent/class";
import { getTranslation } from "@calcom/lib/server/i18n";
import { Person } from "@calcom/types/Calendar";

import { sendRequestRescheduleEmail } from "@lib/emails/email-manager";
import prisma from "@lib/prisma";

const rescheduleSchema = z.object({
  bookingId: z.string(),
  rescheduleReason: z.string().optional(),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession({ req });
  const { bookingId, rescheduleReason: cancellationReason } = req.body;
  type PersonAttendee = Pick<User, "id" | "email" | "name" | "locale" | "timeZone" | "username">;
  let userOwner: PersonAttendee | null;
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
      // throw error;
      return;
    }

    const bookingToReschedule = await prisma.booking.findFirst({
      rejectOnNotFound: true,
      include: { attendees: true },
      where: {
        uid: bookingId,
        NOT: {
          status: BookingStatus.CANCELLED,
        },
      },
    });
    if (bookingToReschedule && bookingToReschedule.eventTypeId && userOwner) {
      const event = await prisma.eventType.findFirst({
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

      // Soft delete
      await prisma.bookingReference.deleteMany({
        where: {
          bookingId: bookingToReschedule.id,
        },
      });

      // @NOTE: Lets assume all guests are the same language
      const [firstAttendee] = bookingToReschedule.attendees;
      const tAttendees = await getTranslation(firstAttendee.locale ?? "en", "common");
      const usersToPeopleType = (users: PersonAttendee[], selectedLanguage: TFunction): Person[] => {
        return users?.map((user) => {
          return {
            id: user.id || "",
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
      const calendarEventBuilder = new CalendarEventBuilder();
      calendarEventBuilder.init({
        title: bookingToReschedule.title,
        type: event?.title || "Nameless Event",
        startTime: bookingToReschedule.startTime.toISOString(),
        endTime: bookingToReschedule.endTime.toISOString(),
        attendees: usersToPeopleType(
          // username field doesn't exists on attendee but could be in the future
          bookingToReschedule.attendees as unknown as PersonAttendee[],
          tAttendees
        ),
        organizer: userOwnerAsPeopleType,
      });
      await calendarEventBuilder.buildEventObjectFromInnerClass(bookingToReschedule.eventTypeId);
      await calendarEventBuilder.buildUsersFromInnerClass();
      if (event?.schedulingType === SchedulingType.ROUND_ROBIN) {
        await calendarEventBuilder.buildLuckyUsers();
      }
      if (event?.schedulingType === SchedulingType.COLLECTIVE) {
        await calendarEventBuilder.buildLuckyUsers();
      }
      await calendarEventBuilder.buildAttendeesList();
      calendarEventBuilder.setLocation(bookingToReschedule.location);
      calendarEventBuilder.setUId(bookingToReschedule.uid);
      calendarEventBuilder.setCancellationReason(cancellationReason);
      console.log({ calendarEventBuilder });
      // Send email =================
      const queryParams = new URLSearchParams();
      queryParams.set("rescheduleUid", `${bookingToReschedule.uid}`);
      const rescheduleLink = `${process.env.WEBSITE_BASE_URL}/${userOwner.username}/${
        event?.slug
      }?${queryParams.toString()}`;
      await sendRequestRescheduleEmail(calendarEventBuilder.calendarEvent, {
        rescheduleLink,
      });
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
