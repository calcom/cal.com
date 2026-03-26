import { getWebhookProducer } from "@calcom/features/di/webhooks/containers/webhook";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

type Booking = {
  userId: number | undefined;
  eventTypeId: number | null;
  eventTypeParentId: number | null | undefined;
  teamId?: number | null;
  uid: string;
};

async function resolveSubscriberContext(booking: Booking) {
  const isTeamBooking = booking.teamId;
  const isBookingForManagedEventtype = booking.teamId && booking.eventTypeParentId;
  const triggerForUser = !isTeamBooking || isBookingForManagedEventtype;
  const userId = triggerForUser ? booking.userId : null;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId: booking.teamId });
  return {
    userId: userId ?? undefined,
    teamId: booking.teamId,
    orgId: orgId ?? undefined,
  };
}

export const triggerRecordingReadyWebhook = async ({
  recordingId,
  booking,
}: {
  recordingId: string;
  booking: Booking;
}) => {
  const subscriberContext = await resolveSubscriberContext(booking);
  const producer = getWebhookProducer();

  await producer.queueRecordingWebhook(WebhookTriggerEvents.RECORDING_READY, {
    recordingId,
    bookingUid: booking.uid,
    eventTypeId: booking.eventTypeId ?? undefined,
    ...subscriberContext,
  });
};

export const triggerTranscriptionGeneratedWebhook = async ({
  recordingId,
  batchProcessorJobId,
  booking,
}: {
  recordingId: string;
  batchProcessorJobId: string;
  booking: Booking;
}) => {
  const subscriberContext = await resolveSubscriberContext(booking);
  const producer = getWebhookProducer();

  await producer.queueRecordingWebhook(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED, {
    recordingId,
    bookingUid: booking.uid,
    eventTypeId: booking.eventTypeId ?? undefined,
    ...subscriberContext,
    batchProcessorJobId,
  });
};
