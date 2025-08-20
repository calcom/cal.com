import type { TGetTranscriptAccessLink } from "@calcom/app-store/dailyvideo/zod";
import { RecordingWebhookService } from "@calcom/features/webhooks/lib/service/RecordingWebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler:triggerRecordingReadyWebhook"] });

type Booking = {
  id: number;
  userId: number | undefined;
  eventTypeId: number | null;
  eventTypeParentId: number | null | undefined;
  teamId?: number | null;
  eventType?: {
    teamId?: number | null;
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
  log.debug("Triggering recording ready webhook", {
    bookingId: booking.id,
    downloadLink,
  });

  const orgId = await getOrgIdFromMemberOrTeamId({
    memberId: booking.userId,
    teamId: booking.eventType?.teamId,
  });

  await RecordingWebhookService.emitRecordingReady({
    evt,
    downloadLink,
    booking: {
      id: booking.id,
      eventTypeId: booking.eventTypeId,
      userId: booking.userId,
    },
    teamId: booking.eventType?.teamId,
    orgId,
  });
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
  log.debug("Triggering transcription generated webhook", {
    bookingId: booking.id,
    downloadLinks,
  });

  const orgId = await getOrgIdFromMemberOrTeamId({
    memberId: booking.userId,
    teamId: booking.eventType?.teamId,
  });

  await RecordingWebhookService.emitTranscriptionGenerated({
    evt,
    downloadLinks: {
      transcription: downloadLinks?.transcription,
      recording: downloadLinks?.recording,
    },
    booking: {
      id: booking.id,
      eventTypeId: booking.eventTypeId,
      userId: booking.userId,
    },
    teamId: booking.eventType?.teamId,
    orgId,
  });
};
