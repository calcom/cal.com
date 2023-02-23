import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendDailyVideoRecordingEmails } from "@calcom/emails";
import { defaultHandler } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

const schema = z.object({
  roomName: z.string(),
  downloadLink: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    return res.status(405).json({ message: "No SendGrid API key or email" });
  }

  const response = schema.safeParse(req.body);

  if (!response.success) {
    return res.status(400).send({
      message: "Invalid Payload",
    });
  }

  const { roomName, downloadLink } = response.data;

  try {
    const bookingReference = await prisma.bookingReference.findFirst({
      where: {
        meetingId: roomName,
      },
      select: {
        type: true,
        booking: {
          select: {
            ...bookingMinimalSelect,
            uid: true,
            location: true,
            user: {
              select: {
                id: true,
                credentials: true,
                timeZone: true,
                email: true,
                name: true,
                locale: true,
                destinationCalendar: true,
              },
            },
          },
        },
      },
    });

    if (!bookingReference || !bookingReference.booking || bookingReference.type !== "daily_video") {
      return res.status(404).send({
        message: `Booking of room ${roomName} does not exist or does not contain daily video as location`,
      });
    }

    const booking = bookingReference.booking;

    await prisma.booking.update({
      where: {
        uid: booking.uid,
      },
      data: {
        isRecorded: true,
      },
    });

    const checkMembership = await prisma.membership.findFirst({
      where: {
        userId: booking?.user?.id,
        team: {
          slug: {
            not: null,
          },
        },
      },
    });

    const hasTeamPlan = !!checkMembership;

    // send emails to all attendees only when user has team plan
    if (hasTeamPlan) {
      const t = await getTranslation(booking?.user?.locale ?? "en", "common");
      const attendeesListPromises = booking.attendees.map(async (attendee) => {
        return {
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: {
            translate: await getTranslation(attendee.locale ?? "en", "common"),
            locale: attendee.locale ?? "en",
          },
        };
      });

      const attendeesList = await Promise.all(attendeesListPromises);

      const evt: CalendarEvent = {
        type: booking.title,
        title: booking.title,
        description: booking.description || undefined,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        organizer: {
          email: booking.user?.email || "Email-less",
          name: booking.user?.name || "Nameless",
          timeZone: booking.user?.timeZone || "Europe/London",
          language: { translate: t, locale: booking?.user?.locale ?? "en" },
        },
        attendees: attendeesList,
        uid: booking.uid,
      };

      await sendDailyVideoRecordingEmails(evt, downloadLink);
    }

    return res.status(200).json({ message: "Success" });
  } catch (err) {
    console.warn("something_went_wrong", err);
    return res.status(500).json({ message: "something went wrong" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
