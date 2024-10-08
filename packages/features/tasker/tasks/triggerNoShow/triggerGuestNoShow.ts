import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { calculateMaxStartTime, sendWebhookPayload, prepareNoShowTrigger } from "./common";

export async function triggerGuestNoShow({ id, payload }: { id: string; payload: string }): Promise<void> {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;

  const { webhook, booking, didGuestJoinTheCall } = result;

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  if (!didGuestJoinTheCall) {
    await sendWebhookPayload(
      webhook,
      WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
      booking,
      maxStartTime
    );
  }

  await prisma.webhookScheduledTriggers.delete({
    where: {
      id,
    },
  });
}
