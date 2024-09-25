import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { calculateMaxStartTime, sendWebhookPayload, prepareNoShowTrigger } from "./common";

export async function triggerHostNoShow(payload: string): Promise<void> {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;

  const { booking, webhook, hostsThatDidntJoinTheCall } = result;

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  const hostsNoShowPromises = hostsThatDidntJoinTheCall.map((host) => {
    return sendWebhookPayload(
      webhook,
      WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      booking,
      maxStartTime,
      host.email
    );
  });

  await Promise.all(hostsNoShowPromises);
}
