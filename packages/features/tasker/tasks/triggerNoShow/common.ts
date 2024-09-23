import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { fetcher } from "@calcom/lib/dailyApiFetcher";

import type { getBooking } from "./getBooking";
import type { TSendNoShowWebhookPayloadSchema } from "./schema";
import { triggerNoShowPayloadSchema } from "./schema";

type Host = {
  id: string;
  email: string;
};

type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TSendNoShowWebhookPayloadSchema["allNoShowWebhooks"][number];
type Participants = TTriggerNoShowPayloadSchema["data"]["participants"];

export const getMeetingSessionsFromRoomName = (roomName: string) => {
  return fetcher(`meetings?room=${roomName}`).then(triggerNoShowPayloadSchema.parse);
};

export function getHosts(booking: Booking): Host[] {
  const hosts = [
    ...(booking?.eventType?.hosts?.map((host) => ({ id: host.id, email: host.email })) ?? []),
    ...(booking?.eventType?.users?.map((user) => ({ id: user.id, email: user.email })) ?? []),
  ];

  if (booking?.user?.id && !hosts.some((host) => host.id === booking.user.id)) {
    hosts.push({ id: booking.user.id, email: booking.user.email });
  }

  return hosts;
}

export function sendWebhookPayload(
  webhook: Webhook,
  triggerEvent: WEBHOOK_TRIGGER_EVENTS,
  booking: Booking,
  roomName: string,
  maxStartTime: number,
  hostEmail?: string
): Promise<any> {
  return sendGenericWebhookPayload({
    secretKey: webhook.secret,
    triggerEvent,
    createdAt: new Date().toISOString(),
    webhook,
    data: {
      bookingId: booking.id,
      roomName,
      startTime: booking.startTime,
      endTime: booking.endTime,
      eventType: booking.eventType,
      message: hostEmail
        ? `Host with email ${hostEmail} did not join the call before ${maxStartTime}`
        : `Guest did not join the call before ${maxStartTime}`,
    },
  }).catch((e) => {
    console.error(
      `Error executing webhook for event: ${triggerEvent}, URL: ${webhook.subscriberUrl}`,
      webhook,
      e
    );
  });
}

export function calculateMaxStartTime(startTime: string, time: number, timeUnit: string): number {
  return dayjs(startTime).add(time, timeUnit.toLowerCase()).unix();
}
