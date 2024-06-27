import type { WebhookTriggerEvents } from "@prisma/client";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler:triggerRecordingReadyWebhook"] });

export const triggerRecordingReadyWebhook = async ({
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

  const organizerUserId = triggerForUser ? booking.userId : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId: booking.teamId });

  const subscriberOptions = {
    userId: organizerUserId,
    eventTypeId: booking.eventTypeId,
    triggerEvent: eventTrigger,
    teamId: booking.teamId,
    orgId,
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
      log.error(
        `Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);
};
