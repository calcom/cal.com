import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getAllTranscriptsAccessLinkFromRoomName } from "@calcom/core/videoClient";
import { sendDailyVideoTranscriptEmails } from "@calcom/emails";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

const testRequestSchema = z.object({
  test: z.enum(["test"]),
});

const log = logger.getSubLogger({ prefix: ["send-daily-video-transcript-handler"] });

const schema = z
  .object({
    version: z.string(),
    type: z.string(),
    id: z.string(),
    payload: z
      .object({
        meeting_id: z.string(),
        end_ts: z.number().optional(),
        room: z.string(),
        start_ts: z.number().optional(),
      })
      .passthrough(),
    event_ts: z.number().optional(),
  })
  .passthrough();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (testRequestSchema.safeParse(req.body).success) {
    return res.status(200).json({ message: "Test request successful" });
  }

  const hmacSecret = process.env.DAILY_MEETING_ENDED_WEBHOOK_SECRET;
  if (!hmacSecret) {
    return res.status(405).json({ message: "No Daily Webhook Secret" });
  }

  const signature = `${req.headers["x-webhook-timestamp"]}.${JSON.stringify(req.body)}`;
  const base64DecodedSecret = Buffer.from(hmacSecret, "base64");
  const hmac = createHmac("sha256", base64DecodedSecret);
  const computed_signature = hmac.update(signature).digest("base64");

  if (req.headers["x-webhook-signature"] !== computed_signature) {
    return res.status(403).json({ message: "Signature does not match" });
  }

  const response = schema.safeParse(req.body);

  log.debug(
    "Daily video transcript webhook Request Body:",
    safeStringify({
      response,
    })
  );

  if (!response.success || response.data.type !== "meeting.ended") {
    return res.status(400).send({
      message: "Invalid Payload",
    });
  }

  const { room, meeting_id } = response.data.payload;

  try {
    const bookingReference = await prisma.bookingReference.findFirst({
      where: { type: "daily_video", uid: room, meetingId: room },
      select: { bookingId: true },
    });

    if (!bookingReference || !bookingReference.bookingId) {
      log.error(
        "bookingReference Not found:",
        safeStringify({
          bookingReference,
          requestBody: req.body,
        })
      );
      return res.status(404).send({ message: "Booking reference not found" });
    }

    const booking = await prisma.booking.findUniqueOrThrow({
      where: {
        id: bookingReference.bookingId,
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
        location: true,
        isRecorded: true,
        eventTypeId: true,
        eventType: {
          select: {
            teamId: true,
            parentId: true,
          },
        },
        user: {
          select: {
            id: true,
            timeZone: true,
            email: true,
            name: true,
            locale: true,
            destinationCalendar: true,
          },
        },
      },
    });

    if (!booking) {
      log.error(
        "Booking Not Found:",
        safeStringify({
          booking,
          requestBody: req.body,
        })
      );

      return res.status(404).send({
        message: `Booking of room_name ${room} does not exist or does not contain daily video as location`,
      });
    }

    const transcripts = await getAllTranscriptsAccessLinkFromRoomName(room);

    if (!transcripts || !transcripts.length)
      return res.status(200).json({ message: `No Transcripts found for room name ${room}` });

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

    // Send emails
    const evt: CalendarEvent = {
      type: booking.title,
      title: booking.title,
      description: booking.description || undefined,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      organizer: {
        email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
        name: booking.user?.name || "Nameless",
        timeZone: booking.user?.timeZone || "Europe/London",
        language: { translate: t, locale: booking?.user?.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: booking.uid,
    };

    await sendDailyVideoTranscriptEmails(evt, transcripts);

    return res.status(200).json({ message: "Success" });
  } catch (err) {
    console.error("Error in /send-daily-video-transcript", err);
    return res.status(500).json({ message: "something went wrong" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
