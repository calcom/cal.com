import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { fetcher } from "@calcom/lib/dailyApiFetcher";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { getBooking } from "./getBooking";
import type { TWebhook } from "./schema";
import { triggerNoShowPayloadSchema } from "./schema";

type Host = {
  id: number;
  email: string;
};

type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TWebhook;
export type Participants = TTriggerNoShowPayloadSchema["data"]["participants"];

export const getMeetingSessionsFromRoomName = async (roomName: string) => {
  return fetcher(`/meetings?room=${roomName}`).then(triggerNoShowPayloadSchema.parse);
};

export function getHosts(booking: Booking): Host[] {
  const hosts = [
    ...(booking?.eventType?.hosts?.map((host) => ({ id: host.userId, email: host.user.email })) ?? []),
    ...(booking?.eventType?.users?.map((user) => ({ id: user.id, email: user.email })) ?? []),
  ];

  if (booking?.user?.id && !hosts.some((host) => host.id === booking?.user?.id)) {
    hosts.push({ id: booking.user.id, email: booking.user.email });
  }

  return hosts;
}

export function sendWebhookPayload(
  webhook: Webhook,
  triggerEvent: WebhookTriggerEvents,
  booking: Booking,
  maxStartTime: number,
  hostEmail?: string
): Promise<any> {
  const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

  return sendGenericWebhookPayload({
    secretKey: webhook.secret,
    triggerEvent,
    createdAt: new Date().toISOString(),
    webhook,
    data: {
      bookingId: booking.id,
      bookingUid: booking.uid,
      startTime: booking.startTime,
      endTime: booking.endTime,
      eventType: booking.eventType,
      message:
        triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
          ? `Guest did't join the call or didn't joined before ${maxStartTimeHumanReadable}`
          : `Host with email ${hostEmail} did't join the call or didn't joined before ${maxStartTimeHumanReadable}`,
    },
  }).catch((e) => {
    console.error(
      `Error executing webhook for event: ${triggerEvent}, URL: ${webhook.subscriberUrl}`,
      webhook,
      e
    );
  });
}

export function calculateMaxStartTime(startTime: Date, time: number, timeUnit: TimeUnit): number {
  return dayjs(startTime).add(time, timeUnit.toLowerCase()).unix();
}
