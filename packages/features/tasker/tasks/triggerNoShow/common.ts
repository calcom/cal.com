import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { fetcher } from "@calcom/lib/dailyApiFetcher";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { TimeUnit } from "@calcom/prisma/enums";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

import { getBooking } from "./getBooking";
import type { TWebhook, TTriggerNoShowPayloadSchema } from "./schema";
import { triggerNoShowPayloadSchema, ZSendNoShowWebhookPayloadSchema } from "./schema";

type Host = {
  id: number;
  email: string;
};

type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TWebhook;
export type Participants = TTriggerNoShowPayloadSchema["data"][number]["participants"];

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
  return dayjs(startTime)
    .add(time, timeUnit.toLowerCase() as dayjs.ManipulateType)
    .unix();
}

export function checkIfUserJoinedTheCall(userId: number, allParticipants: Participants): boolean {
  return allParticipants.some(
    (participant) => participant.user_id && parseInt(participant.user_id) === userId
  );
}

const log = logger.getSubLogger({ prefix: ["triggerNoShowTask"] });

export const prepareNoShowTrigger = async (
  payload: string
): Promise<{
  booking: Booking;
  webhook: TWebhook;
  hostsThatDidntJoinTheCall: Host[];
  numberOfHostsThatJoined: number;
  didGuestJoinTheCall: boolean;
} | void> => {
  const { bookingId, webhook } = ZSendNoShowWebhookPayloadSchema.parse(JSON.parse(payload));

  const booking = await getBooking(bookingId);

  if (booking.status !== BookingStatus.ACCEPTED) {
    log.debug(
      "Booking is not accepted",
      safeStringify({
        bookingId,
        webhook: { id: webhook.id },
      })
    );

    return;
  }

  const dailyVideoReference = booking.references.find((reference) => reference.type === "daily_video");

  if (!dailyVideoReference) {
    log.error(
      "Daily video reference not found",
      safeStringify({
        bookingId,
        webhook: { id: webhook.id },
      })
    );
    throw new Error(`Daily video reference not found in triggerHostNoShow with bookingId ${bookingId}`);
  }
  const meetingDetails = await getMeetingSessionsFromRoomName(dailyVideoReference.uid);

  const hosts = getHosts(booking);
  const allParticipants = meetingDetails.data.flatMap((meeting) => meeting.participants);

  const hostsThatDidntJoinTheCall = hosts.filter(
    (host) => !checkIfUserJoinedTheCall(host.id, allParticipants)
  );

  const numberOfHostsThatJoined = hosts.length - hostsThatDidntJoinTheCall.length;

  const didGuestJoinTheCall = meetingDetails.data.some(
    (meeting) => meeting.max_participants < numberOfHostsThatJoined
  );

  return { hostsThatDidntJoinTheCall, booking, numberOfHostsThatJoined, webhook, didGuestJoinTheCall };
};
