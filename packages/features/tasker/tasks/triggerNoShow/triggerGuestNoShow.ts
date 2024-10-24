import { calculateMaxStartTime, sendWebhookPayload, prepareNoShowTrigger } from "./common";

export async function triggerGuestNoShow(payload: string): Promise<void> {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;

  const { webhook, booking, didGuestJoinTheCall, triggerEvent } = result;

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  if (!didGuestJoinTheCall) {
    await sendWebhookPayload(webhook, triggerEvent, booking, maxStartTime);
  }
}
