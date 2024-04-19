import type { WebhookTriggerEvents } from "@prisma/client";
import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getDownloadLinkOfCalVideoByRecordingId } from "@calcom/core/videoClient";
import { sendDailyVideoRecordingEmails } from "@calcom/emails";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler"] });

const schema = z
  .object({
    version: z.string(),
    type: z.string(),
    id: z.string(),
    payload: z.object({
      recording_id: z.string(),
      end_ts: z.number().optional(),
      room_name: z.string(),
      start_ts: z.number().optional(),
      status: z.string(),

      max_participants: z.number().optional(),
      duration: z.number().optional(),
      s3_key: z.string().optional(),
    }),
    event_ts: z.number().optional(),
  })
  .passthrough();

const downloadLinkSchema = z.object({
  download_link: z.string(),
});

const triggerWebhook = async ({
  evt,
  downloadLink,
  booking,
}: {
  evt: CalendarEvent;
  downloadLink: string;
  booking: {
    userId: number | undefined;
    eventTypeId: number | null;
    eventTypeParentId: number | null | undefined;
    teamId?: number | null;
  };
}) => {
  const eventTrigger: WebhookTriggerEvents = "RECORDING_READY";

  // Send Webhook call if hooked to BOOKING.RECORDING_READY
  const triggerForUser = !booking.teamId || (booking.teamId && booking.eventTypeParentId);

  const subscriberOptions = {
    userId: triggerForUser ? booking.userId : null,
    eventTypeId: booking.eventTypeId,
    triggerEvent: eventTrigger,
    teamId: booking.teamId,
  };
  const webhooks = await getWebhooks(subscriberOptions);

  log.debug(
    "Webhooks:",
    safeStringify({
      webhooks,
    })
  );

  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, {
      ...evt,
      downloadLink,
    }).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}`, e);
    })
  );
  await Promise.all(promises);
};

const testRequestSchema = z.object({
  test: z.enum(["test"]),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    return res.status(405).json({ message: "No SendGrid API key or email" });
  }

  if (testRequestSchema.safeParse(req.body).success) {
    return res.status(200).json({ message: "Test request successful" });
  }

  const hmacSecret = process.env.DAILY_WEBHOOK_SECRET;
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
    "Daily video recording webhook Request Body:",
    safeStringify({
      response,
    })
  );

  if (!response.success || response.data.type !== "recording.ready-to-download") {
    return res.status(400).send({
      message: "Invalid Payload",
    });
  }

  const { room_name, recording_id, status } = response.data.payload;

  if (status !== "finished") {
    return res.status(400).send({
      message: "Recording not finished",
    });
  }

  try {
    const bookingReference = await prisma.bookingReference.findFirst({
      where: { type: "daily_video", uid: room_name, meetingId: room_name },
      select: { bookingId: true },
    });

    if (!bookingReference || !bookingReference.bookingId) {
      log.error(
        "bookingReference:",
        safeStringify({
          bookingReference,
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
        "Booking:",
        safeStringify({
          booking,
        })
      );

      return res.status(404).send({
        message: `Booking of room_name ${room_name} does not exist or does not contain daily video as location`,
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

    await prisma.booking.update({
      where: {
        uid: booking.uid,
      },
      data: {
        isRecorded: true,
      },
    });

    const response = await getDownloadLinkOfCalVideoByRecordingId(recording_id);
    const downloadLinkResponse = downloadLinkSchema.parse(response);
    const downloadLink = downloadLinkResponse.download_link;

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

    const teamId = await getTeamIdFromEventType({
      eventType: {
        team: { id: booking?.eventType?.teamId ?? null },
        parentId: booking?.eventType?.parentId ?? null,
      },
    });

    await triggerWebhook({
      evt,
      downloadLink,
      booking: {
        userId: booking?.user?.id,
        eventTypeId: booking.eventTypeId,
        eventTypeParentId: booking.eventType?.parentId,
        teamId,
      },
    });

    // send emails to all attendees only when user has team plan
    await sendDailyVideoRecordingEmails(evt, downloadLink);
    return res.status(200).json({ message: "Success" });
  } catch (err) {
    console.error("Error in /recorded-daily-video", err);
    return res.status(500).json({ message: "something went wrong" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
