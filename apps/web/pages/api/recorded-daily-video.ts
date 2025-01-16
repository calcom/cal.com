import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { getRoomNameFromRecordingId, getBatchProcessorJobAccessLink } from "@calcom/app-store/dailyvideo/lib";
import { submitBatchProcessorTranscriptionJob } from "@calcom/core/videoClient";
import { getAllTranscriptsAccessLinkFromMeetingId } from "@calcom/core/videoClient";
import { sendDailyVideoRecordingEmails } from "@calcom/emails";
import { sendDailyVideoTranscriptEmails } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server";
import { generateVideoToken } from "@calcom/lib/videoTokens";
import prisma from "@calcom/prisma";
import { getBooking } from "@calcom/web/lib/daily-webhook/getBooking";
import { getBookingReference } from "@calcom/web/lib/daily-webhook/getBookingReference";
import { getCalendarEvent } from "@calcom/web/lib/daily-webhook/getCalendarEvent";
import {
  meetingEndedSchema,
  recordingReadySchema,
  batchProcessorJobFinishedSchema,
  testRequestSchema,
} from "@calcom/web/lib/daily-webhook/schema";
import {
  triggerRecordingReadyWebhook,
  triggerTranscriptionGeneratedWebhook,
} from "@calcom/web/lib/daily-webhook/triggerWebhooks";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler"] });

const computeSignature = (
  hmacSecret: string,
  reqBody: NextApiRequest["body"],
  webhookTimestampHeader: string | string[] | undefined
) => {
  const signature = `${webhookTimestampHeader}.${JSON.stringify(reqBody)}`;
  const base64DecodedSecret = Buffer.from(hmacSecret, "base64");
  const hmac = createHmac("sha256", base64DecodedSecret);
  const computed_signature = hmac.update(signature).digest("base64");
  return computed_signature;
};

const getProxyDownloadLinkOfCalVideo = async (recordingId: string) => {
  const token = generateVideoToken(recordingId);
  const downloadLink = `${WEBAPP_URL}/api/video/recording?token=${token}`;
  return downloadLink;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    return res.status(405).json({ message: "No SendGrid API key or email" });
  }

  if (testRequestSchema.safeParse(req.body).success) {
    return res.status(200).json({ message: "Test request successful" });
  }

  const testMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE;

  if (!testMode) {
    const hmacSecret = process.env.DAILY_WEBHOOK_SECRET;
    if (!hmacSecret) {
      return res.status(405).json({ message: "No Daily Webhook Secret" });
    }

    const computed_signature = computeSignature(hmacSecret, req.body, req.headers["x-webhook-timestamp"]);

    if (req.headers["x-webhook-signature"] !== computed_signature) {
      return res.status(403).json({ message: "Signature does not match" });
    }
  }

  log.debug(
    "Daily video webhook Request Body:",
    safeStringify({
      body: req.body,
    })
  );

  try {
    if (req.body?.type === "recording.ready-to-download") {
      const recordingReadyResponse = recordingReadySchema.safeParse(req.body);

      if (!recordingReadyResponse.success) {
        return res.status(400).send({
          message: "Invalid Payload",
        });
      }

      const { room_name, recording_id, status } = recordingReadyResponse.data.payload;

      if (status !== "finished") {
        return res.status(400).send({
          message: "Recording not finished",
        });
      }

      const bookingReference = await getBookingReference(room_name);
      const booking = await getBooking(bookingReference.bookingId as number);

      const evt = await getCalendarEvent(booking);

      await prisma.booking.update({
        where: {
          uid: booking.uid,
        },
        data: {
          isRecorded: true,
        },
      });

      const downloadLink = await getProxyDownloadLinkOfCalVideo(recording_id);

      const teamId = await getTeamIdFromEventType({
        eventType: {
          team: { id: booking?.eventType?.teamId ?? null },
          parentId: booking?.eventType?.parentId ?? null,
        },
      });

      await triggerRecordingReadyWebhook({
        evt,
        downloadLink,
        booking: {
          userId: booking?.user?.id,
          eventTypeId: booking.eventTypeId,
          eventTypeParentId: booking.eventType?.parentId,
          teamId,
        },
      });

      try {
        // Submit Transcription Batch Processor Job
        await submitBatchProcessorTranscriptionJob(recording_id);
      } catch (err) {
        log.error("Failed to  Submit Transcription Batch Processor Job:", safeStringify(err));
      }

      // send emails to all attendees only when user has team plan
      await sendDailyVideoRecordingEmails(evt, downloadLink);

      return res.status(200).json({ message: "Success" });
    } else if (req.body.type === "meeting.ended") {
      const meetingEndedResponse = meetingEndedSchema.safeParse(req.body);
      if (!meetingEndedResponse.success) {
        return res.status(400).send({
          message: "Invalid Payload",
        });
      }

      const { room, meeting_id } = meetingEndedResponse.data.payload;

      const bookingReference = await getBookingReference(room);
      const booking = await getBooking(bookingReference.bookingId as number);

      const transcripts = await getAllTranscriptsAccessLinkFromMeetingId(meeting_id);

      if (!transcripts || !transcripts.length)
        return res
          .status(200)
          .json({ message: `No Transcripts found for room name ${room} and meeting id ${meeting_id}` });

      const evt = await getCalendarEvent(booking);
      await sendDailyVideoTranscriptEmails(evt, transcripts);

      return res.status(200).json({ message: "Success" });
    } else if (req.body?.type === "batch-processor.job-finished") {
      const batchProcessorJobFinishedResponse = batchProcessorJobFinishedSchema.safeParse(req.body);

      if (!batchProcessorJobFinishedResponse.success) {
        return res.status(400).send({
          message: "Invalid Payload",
        });
      }

      const { id, input } = batchProcessorJobFinishedResponse.data.payload;
      const roomName = await getRoomNameFromRecordingId(input.recordingId);

      const bookingReference = await getBookingReference(roomName);

      const booking = await getBooking(bookingReference.bookingId as number);

      const teamId = await getTeamIdFromEventType({
        eventType: {
          team: { id: booking?.eventType?.teamId ?? null },
          parentId: booking?.eventType?.parentId ?? null,
        },
      });

      const evt = await getCalendarEvent(booking);

      const recording = await getProxyDownloadLinkOfCalVideo(input.recordingId);
      const batchProcessorJobAccessLink = await getBatchProcessorJobAccessLink(id);

      await triggerTranscriptionGeneratedWebhook({
        evt,
        downloadLinks: {
          transcription: batchProcessorJobAccessLink.transcription,
          recording,
        },
        booking: {
          userId: booking?.user?.id,
          eventTypeId: booking.eventTypeId,
          eventTypeParentId: booking.eventType?.parentId,
          teamId,
        },
      });

      return res.status(200).json({ message: "Success" });
    } else {
      log.error("Invalid type in /recorded-daily-video", req.body);

      return res.status(200).json({ message: "Invalid type in /recorded-daily-video" });
    }
  } catch (err) {
    log.error("Error in /recorded-daily-video", err);

    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ message: err.message });
    } else {
      return res.status(500).json({ message: "something went wrong" });
    }
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
