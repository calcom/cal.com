import type { TGetTranscriptAccessLink } from "@calcom/app-store/dailyvideo/zod";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
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
  const isTeamBooking = booking.teamId;
  const isBookingForManagedEventtype = booking.teamId && booking.eventTypeParentId;
  const triggerForUser = !isTeamBooking || isBookingForManagedEventtype;
  const organizerUserId = triggerForUser ? booking.userId : null;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId: booking.teamId });

  return {
    userId: organizerUserId,
    eventTypeId: booking.eventTypeId,
    triggerEvent: eventTrigger,
    teamId: booking.teamId,
    orgId,
  };
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
  const subscriberOptions = await getWebhooksByEventTrigger(eventTrigger, booking);

  log.debug(
    "Webhooks:",
    safeStringify({
      subscriberOptions,
    })
  );

  const payload: EventPayloadType = {
    ...evt,
    downloadLink,
  };

  await WebhookService.sendWebhook(subscriberOptions, payload);
};

export const triggerTranscriptionGeneratedWebhook = async ({
  evt,
  downloadLinks,
  booking,
}: {
  evt: CalendarEvent;
  downloadLinks?: {
    transcription: TGetTranscriptAccessLink["transcription"];
    recording: string;
  };
  booking: Booking;
}) => {
  const subscriberOptions = await getWebhooksByEventTrigger(
    WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
    booking
  );

  log.debug(
    "Webhooks:",
    safeStringify({
      subscriberOptions,
    })
  );

  const payload: EventPayloadType = {
    ...evt,
    downloadLinks,
  };

  await WebhookService.sendWebhook(subscriberOptions, payload);
};
