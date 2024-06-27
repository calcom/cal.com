import type { TGetTranscriptAccessLink } from "@calcom/app-store/dailyvideo/zod";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler:triggerRecordingReadyWebhook"] });

type Booking = {
  userId: number | undefined;
  eventTypeId: number | null;
  eventTypeParentId: number | null | undefined;
  teamId?: number | null;
};

const getWebhooksByEventTrigger = async (eventTrigger: WebhookTriggerEvents, booking: Booking) => {
  const triggerForUser = !booking.teamId || (booking.teamId && booking.eventTypeParentId);
  const organizerUserId = triggerForUser ? booking.userId : null;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId: booking.teamId });

  const subscriberOptions = {
    userId: organizerUserId,
    eventTypeId: booking.eventTypeId,
    triggerEvent: eventTrigger,
    teamId: booking.teamId,
    orgId,
  };

  return getWebhooks(subscriberOptions);
};

export const triggerRecordingReadyWebhook = async ({
  evt,
  downloadLink,
  booking,
}: {
  evt: CalendarEvent;
  downloadLink: string;
  booking: Booking;
}) => {
  const eventTrigger: WebhookTriggerEvents = "RECORDING_READY";
  const webhooks = await getWebhooksByEventTrigger(eventTrigger, booking);

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
      log.error(
        `Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);
};

export const triggerTranscriptionGeneratedWebhook = async ({
  evt,
  transcription,
  booking,
  recordingDownloadLink,
}: {
  evt: CalendarEvent;
  transcription: TGetTranscriptAccessLink["transcription"];
  booking: Booking;
  recordingDownloadLink: string;
}) => {
  const webhooks = await getWebhooksByEventTrigger(
    WebhookTriggerEvents.RECORDING_TRANSCRIPTION_READY,
    booking
  );

  log.debug(
    "Webhooks:",
    safeStringify({
      webhooks,
    })
  );

  const promises = webhooks.map((webhook) =>
    sendPayload(
      webhook.secret,
      WebhookTriggerEvents.RECORDING_TRANSCRIPTION_READY,
      new Date().toISOString(),
      webhook,
      {
        ...evt,
        transcription,
        recordingDownloadLink,
      }
    ).catch((e) => {
      log.error(
        `Error executing webhook for event: ${WebhookTriggerEvents.RECORDING_TRANSCRIPTION_READY}, URL: ${webhook.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);
};
