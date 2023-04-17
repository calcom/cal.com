import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { DailyLocationType } from "@calcom/app-store/locations";
import { getDownloadLinkOfCalVideoByRecordingId } from "@calcom/core/videoClient";
import { sendDailyVideoRecordingEmails } from "@calcom/emails";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

const schema = z.object({
  recordingId: z.string(),
  bookingUID: z.string(),
});

const downloadLinkSchema = z.object({
  download_link: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    return res.status(405).json({ message: "No SendGrid API key or email" });
  }
  const response = schema.safeParse(JSON.parse(req.body));

  if (!response.success) {
    return res.status(400).send({
      message: "Invalid Payload",
    });
  }

  const { recordingId, bookingUID } = response.data;
  const session = await getServerSession({ req, res });

  if (!session?.user) {
    return res.status(401).send({
      message: "User not logged in",
    });
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        uid: bookingUID,
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
        location: true,
        isRecorded: true,
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
    });

    if (!booking || booking.location !== DailyLocationType) {
      return res.status(404).send({
        message: `Booking of uid ${bookingUID} does not exist or does not contain daily video as location`,
      });
    }

    const t = await getTranslation(booking?.user?.locale ?? "en", "common");
    const attendeesListPromises = booking.attendees.map(async (attendee) => {
      return {
        id: attendee.id,
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

    const isUserAttendeeOrOrganiser =
      booking?.user?.id === session.user.id ||
      attendeesList.find((attendee) => attendee.id === session.user.id);

    if (!isUserAttendeeOrOrganiser) {
      return res.status(403).send({
        message: "Unauthorised",
      });
    }

    await prisma.booking.update({
      where: {
        uid: booking.uid,
      },
      data: {
        isRecorded: true,
      },
    });

    const isSendingEmailsAllowed = IS_SELF_HOSTED || session?.user?.belongsToActiveTeam;

    // send emails to all attendees only when user has team plan
    if (isSendingEmailsAllowed) {
      const response = await getDownloadLinkOfCalVideoByRecordingId(recordingId);

      const downloadLinkResponse = downloadLinkSchema.parse(response);
      const downloadLink = downloadLinkResponse.download_link;

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
      return res.status(200).json({ message: "Success" });
    }

    return res.status(403).json({ message: "User does not have team plan to send out emails" });
  } catch (err) {
    console.warn("something_went_wrong", err);
    return res.status(500).json({ message: "something went wrong" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
