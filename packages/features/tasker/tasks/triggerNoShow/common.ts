import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { TimeUnit } from "@calcom/prisma/enums";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

import { getBooking } from "./getBooking";
import { getMeetingSessionsFromRoomName } from "./getMeetingSessionsFromRoomName";
import type { TWebhook, TTriggerNoShowPayloadSchema } from "./schema";
import { ZSendNoShowWebhookPayloadSchema } from "./schema";

export type Host = {
  id: number;
  email: string;
};

export type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TWebhook;
export type Participants = TTriggerNoShowPayloadSchema["data"][number]["participants"];

export function getHosts(booking: Booking): Host[] {
  const hostMap = new Map<number, Host>();

  const addHost = (id: number, email: string) => {
    if (!hostMap.has(id)) {
      hostMap.set(id, { id, email });
    }
  };

  booking?.eventType?.hosts?.forEach((host) => addHost(host.userId, host.user.email));
  booking?.eventType?.users?.forEach((user) => addHost(user.id, user.email));

  // Add booking.user if not already included
  if (booking?.user?.id && booking?.user?.email) {
    addHost(booking.user.id, booking.user.email);
  }

  // Filter hosts to only include those who are also attendees
  const attendeeEmails = new Set(booking.attendees?.map((attendee) => attendee.email));
  const filteredHosts = Array.from(hostMap.values()).filter(
    (host) => attendeeEmails.has(host.email) || host.id === booking.user?.id
  );

  return filteredHosts;
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
      title: booking.title,
      bookingId: booking.id,
      bookingUid: booking.uid,
      startTime: booking.startTime,
      attendees: booking.attendees,
      endTime: booking.endTime,
      ...(!!hostEmail ? { hostEmail } : {}),
      eventType: {
        ...booking.eventType,
        id: booking.eventTypeId,
        hosts: undefined,
        users: undefined,
      },
      webhook: {
        ...webhook,
        secret: undefined,
      },
      message:
        triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
          ? `Guest didn't join the call or didn't join before ${maxStartTimeHumanReadable}`
          : `Host with email ${hostEmail} didn't join the call or didn't join before ${maxStartTimeHumanReadable}`,
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

export const log = logger.getSubLogger({ prefix: ["triggerNoShowTask"] });

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

  const dailyVideoReference =
    booking.references?.filter((reference) => reference.type === "daily_video")?.pop() ?? null;

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
